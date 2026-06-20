import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { TabSection } from '../types';
import Soundfont from 'soundfont-player';
import { isMutedCell, parseTabCellPitches } from '../services/tabNotation';

export interface PlaybackPosition {
  sectionIdx: number;
  measureIdx: number;
  colIdx: number;
}

const TUNING_PITCHES = [64, 59, 55, 50, 45, 40];

interface UsePlaybackOptions {
  sections: TabSection[];
  transposeOffset: number;
}

export const usePlayback = ({ sections, transposeOffset }: UsePlaybackOptions) => {
  const [status, setStatus] = useState<'stopped' | 'playing' | 'paused'>('stopped');
  const [playState, setPlayState] = useState<PlaybackPosition | null>(null);
  const [playBpm, setPlayBpm] = useState(120);
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

  const totalCols = useMemo(() => {
    let total = 0;
    for (const sec of sections) total += (sec.measures?.length ?? 0) * 16;
    return total;
  }, [sections]);

  const positionToIndex = useCallback(
    (pos: PlaybackPosition) => {
      let idx = 0;
      for (let s = 0; s < pos.sectionIdx; s++) {
        idx += (sections[s]?.measures?.length ?? 0) * 16;
      }
      idx += pos.measureIdx * 16 + pos.colIdx;
      return Math.max(0, Math.min(Math.max(0, totalCols - 1), idx));
    },
    [sections, totalCols]
  );

  const indexToPosition = useCallback(
    (index: number): PlaybackPosition => {
      let remaining = Math.max(0, Math.min(Math.max(0, totalCols - 1), index));
      for (let s = 0; s < sections.length; s++) {
        const secCols = (sections[s]?.measures?.length ?? 0) * 16;
        if (remaining >= secCols) {
          remaining -= secCols;
          continue;
        }
        const measureIdx = Math.floor(remaining / 16);
        const colIdx = remaining % 16;
        return { sectionIdx: s, measureIdx, colIdx };
      }
      return { sectionIdx: 0, measureIdx: 0, colIdx: 0 };
    },
    [sections, totalCols]
  );

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

  const stop = useCallback(() => {
    clearIntervalRef();
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
    setStatus('paused');
  }, [clearIntervalRef]);

  const play = useCallback((from?: PlaybackPosition) => {
    if (from) {
      positionRef.current = { ...from };
      setPlayState({ ...from });
    } else if (status === 'paused') {
      setPlayState({ ...positionRef.current });
    } else if (status === 'stopped') {
      positionRef.current = { sectionIdx: 0, measureIdx: 0, colIdx: 0 };
      setPlayState({ sectionIdx: 0, measureIdx: 0, colIdx: 0 });
    }
    setStatus('playing');
  }, [status]);

  const seek = useCallback(
    (index: number) => {
      const next = indexToPosition(index);
      positionRef.current = next;
      setPlayState(next);
      setRevision(r => r + 1);
    },
    [indexToPosition]
  );

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

  const togglePlayPause = useCallback(() => {
    if (status === 'playing') {
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

      const playPitchAt = (sIdx: number, fret: number, when: number, duration = 0.45) => {
        const pitch = TUNING_PITCHES[sIdx] + fret + capo + transposeOffset;
        const inst = instrumentRef.current;
        if (inst) {
          inst.play(pitch, when, {
            gain: Math.max(0, Math.min(1, playbackVolume)) * 0.9,
            duration,
          });
        } else {
          ensureInstrument().catch(() => {});
          const frequency = 440 * Math.pow(2, (pitch - 69) / 12);
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(frequency, when);
          gain.gain.setValueAtTime(0.12 * playbackVolume, when);
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

      for (let sIdx = 0; sIdx < 6; sIdx++) {
        const noteStr = measure[sIdx][cIdx];
        if (!noteStr || noteStr === '-' || noteStr === '·') continue;

        const t0 = audioCtx.currentTime;

        if (isMutedCell(noteStr)) {
          playMuted(t0);
          continue;
        }

        const frets = parseTabCellPitches(noteStr);
        if (frets.length === 0) continue;

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

      // A-B loop has priority when enabled and valid.
      if (abLoop.enabled && abLoop.start !== null && abLoop.end !== null) {
        const start = Math.min(abLoop.start, abLoop.end);
        const end = Math.max(abLoop.start, abLoop.end);
        if (nextIndex > end) nextIndex = start;
      } else if (nextIndex >= totalCols) {
        // Whole-score looping fallback
        if (isLooping && totalCols > 0) {
          nextIndex = 0;
        } else {
          stop();
          return;
        }
      }

      currentIndex = nextIndex;
      setFromIndex(currentIndex);
    }, msPerCol);

    return () => {
      clearIntervalRef();
    };
  }, [status, playBpm, isLooping, abLoop, totalCols, isMetronomeOn, playbackVolume, sections, transposeOffset, revision, clearIntervalRef, stop, ensureAudioContext, ensureInstrument, indexToPosition, positionToIndex]);

  return {
    status,
    isPlaying: status === 'playing',
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
    togglePlayPause,
    abLoop,
    setLoopA,
    setLoopB,
    toggleAbLoop,
    clearAbLoop,
  };
};
