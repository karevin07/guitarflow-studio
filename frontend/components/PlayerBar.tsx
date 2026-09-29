import React, { useState } from 'react';
import {
  Activity,
  ChevronDown,
  Flag,
  FlagOff,
  Gauge,
  Minus,
  Pause,
  Play,
  Plus,
  Repeat,
  SlidersHorizontal,
  Square,
  Volume2,
} from 'lucide-react';
import { MAX_BPM, MIN_BPM } from '../constants/practice';

import { PlayerBarBindings } from '../types/playback';
import { colIndexToMs, formatPlaybackMs } from '../services/playbackTime';

type PlayerBarProps = PlayerBarBindings;

const PlayerBar: React.FC<PlayerBarProps> = ({
  mode,
  isPlaying,
  isPaused,
  onTogglePlayPause,
  onStop,
  playIndex,
  totalCols,
  onSeek,
  abLoop,
  onSetLoopA,
  onSetLoopB,
  onToggleAbLoop,
  onClearAbLoop,
  playBpm,
  onBpmChange,
  isLooping,
  onToggleLoop,
  isMetronomeOn,
  onToggleMetronome,
  playbackVolume,
  onVolumeChange,
}) => {
  const [controlsOpen, setControlsOpen] = useState(false);
  const isAlphaTab = mode === 'alphatab';
  const showStop = isPlaying || isPaused;
  const safeMax = Math.max(1, totalCols - 1);
  const canAb = abLoop.start !== null && abLoop.end !== null;
  const minimumTempo = isAlphaTab ? 50 : MIN_BPM;
  const maximumTempo = isAlphaTab ? 150 : MAX_BPM;
  const seekLabel = isAlphaTab
    ? `${formatPlaybackMs(playIndex)} / ${formatPlaybackMs(totalCols)}`
    : `${formatPlaybackMs(colIndexToMs(playIndex, playBpm))} / ${formatPlaybackMs(colIndexToMs(totalCols, playBpm))}`;

  const nudgeTempo = (delta: number) => {
    onBpmChange(Math.max(minimumTempo, Math.min(maximumTempo, playBpm + delta)));
  };

  return (
    <div className="fixed bottom-[76px] left-3 right-3 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_16px_48px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/95 lg:bottom-5 lg:left-[104px] lg:right-5 print:hidden">
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <button type="button" onClick={onTogglePlayPause} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white transition-colors hover:bg-indigo-600 active:scale-95 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-violet-400" aria-label={isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Play'}>
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>

        {showStop && (
          <button type="button" onClick={onStop} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-zinc-800" aria-label="Stop">
            <Square size={14} fill="currentColor" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-zinc-500">
            <span>{isPlaying ? 'Playing' : isPaused ? 'Paused' : 'Ready'}</span>
            <span className="font-mono tracking-normal">{seekLabel}</span>
          </div>
          <input type="range" min={0} max={safeMax} value={Math.min(playIndex, safeMax)} disabled={totalCols <= 1} onChange={event => onSeek(Number(event.target.value))} className="block h-1 w-full cursor-pointer accent-indigo-600 disabled:opacity-30 dark:accent-violet-500" aria-label="Playback position" />
        </div>

        <div className="hidden shrink-0 items-center rounded-xl bg-slate-100 p-1 dark:bg-zinc-800 sm:flex">
          <button type="button" onClick={() => nudgeTempo(-5)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white dark:text-zinc-400 dark:hover:bg-zinc-700" aria-label="Decrease tempo"><Minus size={13} /></button>
          <div className="min-w-16 px-2 text-center">
            <div className="font-mono text-xs font-bold text-slate-800 dark:text-zinc-100">{playBpm}</div>
            <div className="text-[7px] font-semibold uppercase tracking-wider text-slate-400">{isAlphaTab ? 'speed %' : 'bpm'}</div>
          </div>
          <button type="button" onClick={() => nudgeTempo(5)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white dark:text-zinc-400 dark:hover:bg-zinc-700" aria-label="Increase tempo"><Plus size={13} /></button>
        </div>

        <button type="button" onClick={() => setControlsOpen(value => !value)} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${controlsOpen ? 'bg-indigo-50 text-indigo-700 dark:bg-violet-950/50 dark:text-violet-300' : 'text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800'}`} aria-label="Playback controls" aria-expanded={controlsOpen}>
          {controlsOpen ? <ChevronDown size={17} /> : <SlidersHorizontal size={17} />}
        </button>
      </div>

      {controlsOpen && (
        <div className="grid gap-4 border-t border-slate-200 px-4 py-4 dark:border-zinc-800 md:grid-cols-[1fr_auto_auto] md:items-center">
          <div className="flex items-center gap-3">
            <Gauge size={14} className="shrink-0 text-slate-400" />
            <input type="range" min={minimumTempo} max={maximumTempo} value={playBpm} onChange={event => onBpmChange(Number(event.target.value))} className="h-1 min-w-0 flex-1 accent-indigo-600 dark:accent-violet-500" aria-label={isAlphaTab ? 'Playback speed' : 'Tempo'} />
            <span className="w-16 text-right font-mono text-xs font-semibold text-slate-600 dark:text-zinc-300">{playBpm} {isAlphaTab ? '%' : 'BPM'}</span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            <button type="button" onClick={onSetLoopA} className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[9px] font-semibold uppercase tracking-wider ${abLoop.start !== null ? 'bg-indigo-50 text-indigo-700 dark:bg-violet-950/50 dark:text-violet-300' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}><Flag size={13} /> A</button>
            <button type="button" onClick={onSetLoopB} className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[9px] font-semibold uppercase tracking-wider ${abLoop.end !== null ? 'bg-indigo-50 text-indigo-700 dark:bg-violet-950/50 dark:text-violet-300' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}><Flag size={13} /> B</button>
            <button type="button" onClick={onToggleAbLoop} disabled={!canAb} className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[9px] font-semibold uppercase tracking-wider disabled:opacity-30 ${abLoop.enabled ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}><Repeat size={13} /> A–B</button>
            <button type="button" onClick={onClearAbLoop} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-zinc-800" aria-label="Clear A-B loop"><FlagOff size={13} /></button>
            <button type="button" onClick={onToggleLoop} className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[9px] font-semibold uppercase tracking-wider ${isLooping ? 'bg-indigo-50 text-indigo-700 dark:bg-violet-950/50 dark:text-violet-300' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}><Repeat size={13} /> Loop</button>
            <button type="button" onClick={onToggleMetronome} className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[9px] font-semibold uppercase tracking-wider ${isMetronomeOn ? 'bg-indigo-50 text-indigo-700 dark:bg-violet-950/50 dark:text-violet-300' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}><Activity size={13} /> Click</button>
          </div>

          <label className="flex min-w-32 items-center gap-2">
            <Volume2 size={14} className="shrink-0 text-slate-400" />
            <input type="range" min="0" max="1" step="0.05" value={playbackVolume} onChange={event => onVolumeChange(Number(event.target.value))} className="h-1 min-w-0 flex-1 accent-indigo-600 dark:accent-violet-500" aria-label="Playback volume" />
          </label>
        </div>
      )}
    </div>
  );
};

export default PlayerBar;
