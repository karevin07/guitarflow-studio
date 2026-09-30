import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChordDefinition, SongVoicingPlan, TabSection } from '../types';
import { PlaybackPosition } from '../types/playback';
import Soundfont from 'soundfont-player';
import { isMutedCell, parseTabCellPitches } from '../services/tabNotation';
import { transposeChordSymbol } from '../music-theory';
import { resolvePlannedVoicing } from '../services/voicingPlan';
import { DEFAULT_BPM } from '../constants/practice';
import { RhythmPattern, beatSteps, chordAtOrBefore, parsePattern, scheduleBeat } from '../services/accompaniment';
import {
  DEFAULT_TEMPO_TRAINER,
  TempoTrainer,
  countInBeats,
  isRangeLooped,
  loadCountInBars,
  nextTrainedBpm,
  saveCountInBars,
} from '../services/practiceTools';
import { buildTimeline, stepRange, timelineIndex, timelinePosition } from '../services/songForm';

export type { PlaybackPosition };

const TUNING_PITCHES = [64, 59, 55, 50, 45, 40];

interface UsePlaybackOptions {
  sections: TabSection[];
  transposeOffset: number;
  chordLibrary?: ChordDefinition[];
  voicingPlan?: SongVoicingPlan;
  /** Section indices in play order (repeats expanded); defaults to the written order. */
  order?: number[];
}

export const usePlayback = ({ sections, transposeOffset, chordLibrary = [], voicingPlan = {}, order }: UsePlaybackOptions) => {
  // 'countIn' clicks the metronome for a bar or two before 'playing' starts.
  const [status, setStatus] = useState<'stopped' | 'countIn' | 'playing' | 'paused'>('stopped');
  const [countInBars, setCountInBarsState] = useState(loadCountInBars);
  const [countInBeat, setCountInBeat] = useState<number | null>(null);
  const [tempoTrainer, setTempoTrainer] = useState<TempoTrainer>(DEFAULT_TEMPO_TRAINER);
  const [playState, setPlayState] = useState<PlaybackPosition | null>(null);
  const [playBpm, setPlayBpm] = useState(DEFAULT_BPM);
  const [isLooping, setIsLooping] = useState(false);
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const [playbackVolume, setPlaybackVolume] = useState(0.5);
  const [revision, setRevision] = useState(0);
  const [abLoop, setAbLoop] = useState<{
    enabled: boolean;
    start: number | null;
    end: number | null;
  }>({ enabled: false, start: null, end: null });

  const positionRef = useRef<PlaybackPosition>({ sectionIdx: 0, measureIdx: 0, colIdx: 0 });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const instrumentRef = useRef<Soundfont.Player | null>(null);
  const loadingInstrumentRef = useRef<Promise<Soundfont.Player> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parsed accompaniment per section; null when a section has no (valid) pattern.
  const sectionPatterns = useMemo<Array<RhythmPattern | null>>(() => sections.map(section => {
    if (!section.pattern?.trim()) return null;
    const result = parsePattern(section.pattern);
    return result.ok ? result.pattern : null;
  }), [sections]);

  // Playback walks the play order, so a repeated chorus is played (and counted) twice.
  const orderKey = order?.join(',') ?? '';
  const timeline = useMemo(() => {
    const valid = (order ?? []).filter(index => index >= 0 && index < sections.length);
    return buildTimeline(valid.length > 0 ? valid : sections.map((_, index) => index), sections);
  }, [orderKey, sections]); // eslint-disable-line react-hooks/exhaustive-deps
  const totalCols = timeline.total;

  // A position without a step (e.g. a clicked bar) maps to that section's next play from the current step.
  const positionToIndex = useCallback(
    (pos: PlaybackPosition) => timelineIndex(timeline, pos, positionRef.current.step ?? 0),
    [timeline]
  );

  const indexToPosition = useCallback((index: number): PlaybackPosition => timelinePosition(timeline, index), [timeline]);

  const clearIntervalRef = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const ensureAudioContext = useCallback(() => {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContextClass();
    return audioCtxRef.current;
  }, []);

  const ensureInstrument = useCallback(async () => {
    if (instrumentRef.current) return instrumentRef.current;
    if (loadingInstrumentRef.current) return loadingInstrumentRef.current;
    const ctx = ensureAudioContext();
    loadingInstrumentRef.current = Soundfont.instrument(ctx, 'acoustic_guitar_steel', {
      gain: 0.9,
    }).then(inst => {
      instrumentRef.current = inst;
      return inst;
    });
    return loadingInstrumentRef.current;
  }, [ensureAudioContext]);

  const setCountInBars = useCallback((bars: number) => {
    setCountInBarsState(bars);
    saveCountInBars(bars);
  }, []);

  const stop = useCallback(() => {
    clearIntervalRef();
    setCountInBeat(null);
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    instrumentRef.current = null;
    loadingInstrumentRef.current = null;
    positionRef.current = { sectionIdx: 0, measureIdx: 0, colIdx: 0 };
    setPlayState(null);
    setStatus('stopped');
  }, [clearIntervalRef]);

  const pause = useCallback(() => {
    clearIntervalRef();
    setCountInBeat(null);
    setStatus('paused');
  }, [clearIntervalRef]);

  const play = useCallback((from?: PlaybackPosition) => {
    try {
      const context = ensureAudioContext();
      if (context.state === 'suspended') void context.resume();
    } catch (error) {
      console.error('Web Audio API not supported', error);
      return;
    }
    if (from) {
      positionRef.current = { ...from };
      setPlayState({ ...from });
    } else if (status === 'paused') {
      setPlayState({ ...positionRef.current });
    } else if (status === 'stopped') {
      positionRef.current = { sectionIdx: 0, measureIdx: 0, colIdx: 0 };
      setPlayState({ sectionIdx: 0, measureIdx: 0, colIdx: 0 });
    }
    setStatus(countInBars > 0 ? 'countIn' : 'playing');
  }, [ensureAudioContext, status, countInBars]);

  const seek = useCallback(
    (index: number) => {
      const next = indexToPosition(index);
      positionRef.current = next;
      setPlayState(next);
      setRevision(r => r + 1);
    },
    [indexToPosition]
  );

  /** Move to the start of a step of the play order (keeps playing if it was). */
  const seekStep = useCallback((step: number) => {
    const start = timeline.starts[step];
    if (start !== undefined) seek(start);
  }, [timeline, seek]);

  const setLoopA = useCallback(() => {
    const idx = playState ? positionToIndex(playState) : positionToIndex(positionRef.current);
    setAbLoop(prev => ({ ...prev, start: idx }));
  }, [playState, positionToIndex]);

  const setLoopB = useCallback(() => {
    const idx = playState ? positionToIndex(playState) : positionToIndex(positionRef.current);
    setAbLoop(prev => ({ ...prev, end: idx }));
  }, [playState, positionToIndex]);

  const toggleAbLoop = useCallback(() => {
    setAbLoop(prev => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const clearAbLoop = useCallback(() => {
    setAbLoop({ enabled: false, start: null, end: null });
  }, []);

  // The step to use for a section: the one playing now, else its first play.
  const stepOfSection = useCallback((sectionIdx: number) => {
    const current = positionRef.current.step;
    if (current !== undefined && timeline.order[current] === sectionIdx) return current;
    return timeline.order.indexOf(sectionIdx);
  }, [timeline]);

  /** Loop one section and play it from the top; calling it again on that section turns the loop off. */
  const loopSection = useCallback((sectionIdx: number) => {
    const looped = timeline.order.some((index, step) => index === sectionIdx && isRangeLooped(abLoop, stepRange(timeline, step)));
    if (looped) {
      setAbLoop({ enabled: false, start: null, end: null });
      return;
    }
    const range = stepRange(timeline, stepOfSection(sectionIdx));
    if (!range) return;
    setAbLoop({ enabled: true, start: range.start, end: range.end });
    clearIntervalRef();
    play(indexToPosition(range.start));
  }, [timeline, abLoop, stepOfSection, clearIntervalRef, play, indexToPosition]);

  const loopedSectionIdx = useMemo(() => {
    const step = timeline.order.findIndex((_, index) => isRangeLooped(abLoop, stepRange(timeline, index)));
    return step >= 0 ? timeline.order[step] : -1;
  }, [timeline, abLoop]);

  // Count-in: click each beat, accenting the first, then start playing.
  useEffect(() => {
    if (status !== 'countIn') return;
    let context: AudioContext;
    try {
      context = ensureAudioContext();
    } catch {
      setStatus('playing');
      return;
    }
    const beats = countInBeats(countInBars, sections[positionRef.current.sectionIdx]?.timeSignature);
    const msPerBeat = 60000 / playBpm;
    let beat = 0;
    const click = () => {
      if (beat >= beats) {
        clearIntervalRef();
        setCountInBeat(null);
        setStatus('playing');
        return;
      }
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.connect(gain);
      gain.connect(context.destination);
      osc.frequency.setValueAtTime(beat === 0 ? 1200 : 800, context.currentTime);
      gain.gain.setValueAtTime(0.18 * Math.max(0.3, playbackVolume), context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.05);
      osc.start();
      osc.stop(context.currentTime + 0.05);
      setCountInBeat(beats - beat);
      beat += 1;
    };
    click();
    intervalRef.current = setInterval(click, msPerBeat);
    return () => clearIntervalRef();
  }, [status, countInBars, playBpm, playbackVolume, sections, ensureAudioContext, clearIntervalRef]);

  const togglePlayPause = useCallback(() => {
    if (status === 'playing' || status === 'countIn') {
      pause();
    } else {
      play();
    }
  }, [status, play, pause]);

  useEffect(() => {
    if (status !== 'playing') return;

    try {
      ensureAudioContext();
    } catch (e) {
      console.error('Web Audio API not supported', e);
      setStatus('paused');
      return;
    }

    const msPerCol = (60 / playBpm) / 4 * 1000;
    let currentIndex = positionToIndex(positionRef.current);

    const playSoundForCol = (secIdx: number, measIdx: number, cIdx: number) => {
      const audioCtx = audioCtxRef.current;
      if (!audioCtx) return;

      const section = sections[secIdx];
      if (!section) return;
      const measure = section.measures[measIdx];
      if (!measure) return;

      if (isMetronomeOn && cIdx % 4 === 0) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(cIdx === 0 ? 1000 : 750, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08 * playbackVolume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.04);
      }

      const capo = section.capo || 0;

      const playPitchAt = (sIdx: number, fret: number, when: number, duration = 0.45, applyTranspose = true, velocity = 1) => {
        const pitch = TUNING_PITCHES[sIdx] + fret + capo + (applyTranspose ? transposeOffset : 0);
        const inst = instrumentRef.current;
        if (inst) {
          // The player's types only list note names, but it reads numeric strings as MIDI numbers.
          inst.play(String(pitch), when, {
            gain: Math.max(0, Math.min(1, playbackVolume)) * 0.9 * velocity,
            duration,
          });
        } else {
          ensureInstrument().catch(() => {});
          const frequency = 440 * Math.pow(2, (pitch - 69) / 12);
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(frequency, when);
          gain.gain.setValueAtTime(0.12 * playbackVolume * velocity, when);
          gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(when);
          osc.stop(when + duration);
        }
      };

      const playMuted = (when: number) => {
        const bufferSize = audioCtx.sampleRate * 0.03;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
        const src = audioCtx.createBufferSource();
        const gain = audioCtx.createGain();
        src.buffer = buffer;
        gain.gain.setValueAtTime(0.06 * playbackVolume, when);
        gain.gain.exponentialRampToValueAtTime(0.001, when + 0.03);
        src.connect(gain);
        gain.connect(audioCtx.destination);
        src.start(when);
      };

      let hasTabEvent = false;
      for (let sIdx = 0; sIdx < 6; sIdx++) {
        const noteStr = measure[sIdx][cIdx];
        if (!noteStr || noteStr === '-' || noteStr === '·') continue;

        const t0 = audioCtx.currentTime;

        if (isMutedCell(noteStr)) {
          hasTabEvent = true;
          playMuted(t0);
          continue;
        }

        const frets = parseTabCellPitches(noteStr);
        if (frets.length === 0) continue;
        hasTabEvent = true;

        const isBend = /^\d+b\d+$/i.test(noteStr);
        if (frets.length === 2 && isBend) {
          playPitchAt(sIdx, frets[0], t0, 0.35);
          playPitchAt(sIdx, frets[1], t0 + 0.12, 0.35);
        } else if (frets.length === 2) {
          playPitchAt(sIdx, frets[0], t0, 0.25);
          playPitchAt(sIdx, frets[1], t0 + 0.08, 0.35);
        } else {
          playPitchAt(sIdx, frets[0], t0);
        }
      }

      const voicingFor = (symbol: string) => {
        const effectiveSymbol = transposeChordSymbol(symbol, transposeOffset) ?? symbol;
        return resolvePlannedVoicing(symbol, effectiveSymbol, voicingPlan, chordLibrary);
      };

      // Accompaniment: on each beat, play the section's rhythm pattern on the current chord.
      const pattern = sectionPatterns[secIdx];
      if (pattern) {
        if (cIdx % 4 === 0) {
          let symbol = chordAtOrBefore(section, measIdx, cIdx);
          for (let previous = secIdx - 1; !symbol && previous >= 0; previous -= 1) {
            const earlier = sections[previous];
            symbol = earlier ? chordAtOrBefore(earlier, earlier.chords.length - 1, 15) : null;
          }
          const voicing = symbol ? voicingFor(symbol) : null;
          if (voicing) {
            const now = audioCtx.currentTime;
            const beat = scheduleBeat(beatSteps(pattern, cIdx / 4), voicing.frets, 60 / playBpm);
            beat.notes.forEach(note => playPitchAt(note.stringIndex, note.fret, now + note.offset, note.duration, false, note.volume));
            beat.mutes.forEach(offset => playMuted(now + offset));
          }
        }
        return;
      }

      // Read mode is chord/lyric-first and may not contain tablature notes.
      // In that case, voice the chord at this column so Play remains audible.
      const chordSymbol = section.chords[measIdx]?.[cIdx];
      if (!hasTabEvent && chordSymbol) {
        const voicing = voicingFor(chordSymbol);
        voicing?.frets.forEach((fret, stringIndex) => {
          if (fret !== null) playPitchAt(stringIndex, fret, audioCtx.currentTime, 0.72, false);
        });
      }
    };

    const setFromIndex = (idx: number) => {
      const pos = indexToPosition(idx);
      positionRef.current = pos;
      setPlayState(pos);
      playSoundForCol(pos.sectionIdx, pos.measureIdx, pos.colIdx);
    };

    setFromIndex(currentIndex);

    intervalRef.current = setInterval(() => {
      let nextIndex = currentIndex + 1;

      let wrapped = false;
      // A-B loop has priority when enabled and valid.
      if (abLoop.enabled && abLoop.start !== null && abLoop.end !== null) {
        const start = Math.min(abLoop.start, abLoop.end);
        const end = Math.max(abLoop.start, abLoop.end);
        if (nextIndex > end) {
          nextIndex = start;
          wrapped = true;
        }
      } else if (nextIndex >= totalCols) {
        // Whole-score looping fallback
        if (isLooping && totalCols > 0) {
          nextIndex = 0;
          wrapped = true;
        } else {
          stop();
          return;
        }
      }

      // Tempo trainer: each pass of the loop is a little faster. Changing the BPM restarts this
      // effect from positionRef, which then plays the loop's first column itself.
      if (wrapped) {
        const trainedBpm = nextTrainedBpm(playBpm, tempoTrainer);
        if (trainedBpm !== playBpm) {
          clearIntervalRef();
          positionRef.current = indexToPosition(nextIndex);
          setPlayBpm(trainedBpm);
          return;
        }
      }

      currentIndex = nextIndex;
      setFromIndex(currentIndex);
    }, msPerCol);

    return () => {
      clearIntervalRef();
    };
  }, [status, playBpm, isLooping, abLoop, tempoTrainer, sectionPatterns, totalCols, isMetronomeOn, playbackVolume, sections, transposeOffset, chordLibrary, voicingPlan, revision, clearIntervalRef, stop, ensureAudioContext, ensureInstrument, indexToPosition, positionToIndex]);

  return {
    status,
    isPlaying: status === 'playing',
    isCountingIn: status === 'countIn',
    countInBeat,
    countInBars,
    setCountInBars,
    tempoTrainer,
    setTempoTrainer,
    loopSection,
    loopedSectionIdx,
    isPaused: status === 'paused',
    playState,
    playIndex: playState ? positionToIndex(playState) : 0,
    totalCols,
    playBpm,
    setPlayBpm,
    isLooping,
    setIsLooping,
    isMetronomeOn,
    setIsMetronomeOn,
    playbackVolume,
    setPlaybackVolume,
    play,
    pause,
    stop,
    seek,
    seekStep,
    togglePlayPause,
    abLoop,
    setLoopA,
    setLoopB,
    toggleAbLoop,
    clearAbLoop,
  };
};
