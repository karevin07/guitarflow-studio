import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Pause, Play, RotateCcw, X } from 'lucide-react';
import { ChordDefinition, SongVoicingPlan } from '../types';
import { resolvePlannedVoicing } from '../services/voicingPlan';
import { playClick, previewChordVoicing } from '../services/chordPreview';
import ChordDiagram from './ChordDiagram';

interface ChordSwitchTrainerProps {
  /** Chord symbols as stored in the song. */
  chords: string[];
  /** How a stored symbol is shown (after transpose / capo view). */
  displayChord: (symbol: string) => string;
  chordLibrary: ChordDefinition[];
  voicingPlan: SongVoicingPlan;
  theme: 'light' | 'dark';
  onClose: () => void;
}

const DURATIONS = [30, 60, 120];
const BEATS_PER_CHORD = [4, 2, 1];
const BEST_KEY = 'guitarflow-chord-switch-best';

const loadBest = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
};

/** The classic one-minute chord change drill: alternate two chords on the beat and count the changes. */
const ChordSwitchTrainer: React.FC<ChordSwitchTrainerProps> = ({ chords, displayChord, chordLibrary, voicingPlan, theme, onClose }) => {
  const [first, setFirst] = useState(chords[0] ?? '');
  const [second, setSecond] = useState(chords[1] ?? chords[0] ?? '');
  const [bpm, setBpm] = useState(60);
  const [beatsPerChord, setBeatsPerChord] = useState(4);
  const [duration, setDuration] = useState(60);
  const [running, setRunning] = useState(false);
  const [elapsedBeats, setElapsedBeats] = useState(0);
  const [best, setBest] = useState(loadBest);
  const timerRef = useRef<number | null>(null);
  const beatRef = useRef(0);

  const pairKey = `${first}|${second}`;
  const totalBeats = Math.floor((duration * bpm) / 60);
  // The first chord is not a change: a change happens each time a new chord block starts.
  const blockIndex = elapsedBeats > 0 ? Math.floor((elapsedBeats - 1) / beatsPerChord) : 0;
  const changes = blockIndex;
  const current = blockIndex % 2 === 0 ? first : second;
  const upcoming = current === first ? second : first;
  const finished = elapsedBeats >= totalBeats && totalBeats > 0;
  const secondsLeft = Math.max(0, Math.ceil(((totalBeats - elapsedBeats) * 60) / bpm));

  const shapes = useMemo(() => {
    const shapeFor = (symbol: string) => resolvePlannedVoicing(symbol, displayChord(symbol), voicingPlan, chordLibrary);
    return { [first]: shapeFor(first), [second]: shapeFor(second) };
  }, [first, second, displayChord, voicingPlan, chordLibrary]);

  // The ticking timer reads the latest chords through a ref so parent re-renders never restart it.
  const soundRef = useRef({ first, second, shapes });
  soundRef.current = { first, second, shapes };

  const stopTimer = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => stopTimer, []);
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const beat = beatRef.current;
      if (beat >= totalBeats) return;
      const onChange = beat % beatsPerChord === 0;
      void playClick(onChange).catch(() => undefined);
      if (onChange) {
        const { first: a, second: b, shapes: shapeBySymbol } = soundRef.current;
        const shape = shapeBySymbol[Math.floor(beat / beatsPerChord) % 2 === 0 ? a : b];
        if (shape) void previewChordVoicing(shape.frets, 0.4).catch(() => undefined);
      }
      beatRef.current = beat + 1;
      setElapsedBeats(beat + 1);
    };
    tick();
    timerRef.current = window.setInterval(tick, 60000 / bpm);
    return stopTimer;
  }, [running, bpm, beatsPerChord, totalBeats]);

  useEffect(() => {
    if (!finished) return;
    setRunning(false);
    if (changes > (best[pairKey] ?? 0)) {
      const next = { ...best, [pairKey]: changes };
      setBest(next);
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(next));
      } catch {
        // Best scores are a convenience.
      }
    }
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setRunning(false);
    beatRef.current = 0;
    setElapsedBeats(0);
  };
  const locked = running || elapsedBeats > 0;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/40 backdrop-blur-[2px] sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="換和弦練習" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl dark:bg-zinc-900 sm:rounded-3xl sm:p-7" onClick={event => event.stopPropagation()}>
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">換和弦練習</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">跟著拍子在兩個和弦之間來回切換，看看時間內能換幾次。</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label="關閉"><X size={18} /></button>
        </header>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          {[['和弦 1', first, setFirst], ['和弦 2', second, setSecond]].map(([label, value, setValue], index) => (
            <React.Fragment key={label as string}>
              {index === 1 && <ArrowLeftRight className="mx-auto hidden text-slate-400 sm:block" size={18} />}
              <label className="block text-xs font-semibold text-slate-500">
                {label as string}
                <select value={value as string} disabled={locked} onChange={event => (setValue as (v: string) => void)(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-base font-bold text-slate-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" aria-label={label as string}>
                  {chords.map(symbol => <option key={symbol} value={symbol}>{displayChord(symbol)}</option>)}
                </select>
              </label>
            </React.Fragment>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-xs font-semibold text-slate-600 dark:text-zinc-300">
          <label className="flex items-center gap-2">速度
            <input type="number" min={30} max={200} value={bpm} disabled={locked} onChange={event => setBpm(Math.max(30, Math.min(200, Number(event.target.value) || 60)))} className="h-10 w-20 rounded-lg border border-slate-200 bg-white px-2 font-mono disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800" aria-label="練習速度" /> BPM
          </label>
          <label className="flex items-center gap-2">每
            <select value={beatsPerChord} disabled={locked} onChange={event => setBeatsPerChord(Number(event.target.value))} className="h-10 rounded-lg border border-slate-200 bg-white px-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800" aria-label="每幾拍換一次">
              {BEATS_PER_CHORD.map(beats => <option key={beats} value={beats}>{beats}</option>)}
            </select> 拍換一次
          </label>
          <label className="flex items-center gap-2">時間
            <select value={duration} disabled={locked} onChange={event => setDuration(Number(event.target.value))} className="h-10 rounded-lg border border-slate-200 bg-white px-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800" aria-label="練習時間">
              {DURATIONS.map(seconds => <option key={seconds} value={seconds}>{seconds} 秒</option>)}
            </select>
          </label>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4" data-testid="chord-switch-stage">
          {[current, upcoming].map((symbol, index) => (
            <div key={`${index}-${symbol}`} className={`rounded-2xl border p-4 text-center ${index === 0 ? 'border-[#2b6c59] bg-[#edf4ef] dark:border-emerald-500 dark:bg-emerald-950/30' : 'border-slate-200 opacity-70 dark:border-zinc-700'}`}>
              <div className="text-[11px] font-semibold text-slate-500">{index === 0 ? '現在' : '下一個'}</div>
              <div className="mt-1 font-mono text-3xl font-bold" data-testid={index === 0 ? 'chord-switch-current' : undefined}>{symbol ? displayChord(symbol) : '—'}</div>
              {shapes[symbol] && <div className="mx-auto mt-2 w-28"><ChordDiagram chord={{ ...shapes[symbol]!, name: displayChord(symbol) }} size={112} theme={theme} variant="bare" /></div>}
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => (finished ? reset() : setRunning(value => !value))} disabled={!first || !second || first === second} className="flex h-12 items-center gap-2 rounded-xl bg-[#2b6c59] px-6 text-sm font-semibold text-white disabled:opacity-40">
            {running ? <><Pause size={16} />暫停</> : finished ? <><RotateCcw size={16} />再一次</> : <><Play size={16} />{elapsedBeats > 0 ? '繼續' : '開始'}</>}
          </button>
          {!running && elapsedBeats > 0 && !finished && (
            <button type="button" onClick={reset} className="flex h-12 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold dark:border-zinc-700"><RotateCcw size={15} />重來</button>
          )}
          <div className="ml-auto flex gap-6 text-right">
            <div><div className="text-[11px] font-semibold text-slate-500">剩下</div><div className="font-mono text-2xl font-bold" aria-label="剩下秒數">{secondsLeft}s</div></div>
            <div><div className="text-[11px] font-semibold text-slate-500">換了</div><div className="font-mono text-2xl font-bold" data-testid="chord-switch-count">{changes}</div></div>
            <div><div className="text-[11px] font-semibold text-slate-500">最佳</div><div className="font-mono text-2xl font-bold">{best[pairKey] ?? '—'}</div></div>
          </div>
        </div>
        {first === second && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">請選兩個不同的和弦。</p>}
        {finished && <p className="mt-3 text-sm font-semibold text-[#2b6c59] dark:text-emerald-400" role="status">{duration} 秒內換了 {changes} 次{changes >= (best[pairKey] ?? 0) ? '，新紀錄！' : ''}</p>}
      </div>
    </div>
  );
};

export default ChordSwitchTrainer;
