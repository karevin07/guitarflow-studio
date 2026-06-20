import React from 'react';
import { Play, Pause, Square, Repeat, Volume2, Activity, Flag, FlagOff } from 'lucide-react';

import { PlayerBarBindings } from '../types/playback';

type PlayerBarProps = PlayerBarBindings;

const formatMs = (ms: number) => {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

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
  const isAlphaTab = mode === 'alphatab';
  const showStop = isPlaying || isPaused;
  const canSeek = totalCols > 1;
  const safeMax = Math.max(1, totalCols - 1);
  const canAb = abLoop.start !== null && abLoop.end !== null;
  const seekLabel = isAlphaTab
    ? `${formatMs(playIndex)} / ${formatMs(totalCols)}`
    : null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 px-8 py-4 rounded-2xl shadow-2xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-6 z-50 animate-in slide-in-from-bottom-6 duration-300 w-11/12 max-w-4xl">
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onTogglePlayPause}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 dark:from-violet-600 dark:to-fuchsia-600 text-white shadow-md shadow-indigo-500/20 hover:opacity-95 active:scale-95 transition-all"
          title={isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Play'}
        >
          {isPlaying ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" className="ml-0.5" />
          )}
        </button>
        {showStop && (
          <button
            onClick={onStop}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Stop"
          >
            <Square size={16} fill="currentColor" />
          </button>
        )}
      </div>

      <div className="h-6 w-[1px] bg-slate-200 dark:bg-zinc-800 hidden sm:block flex-shrink-0" />

      <div className="flex items-center gap-3 flex-grow min-w-[140px]">
        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-none whitespace-nowrap">
          {seekLabel ?? 'Seek'}
        </span>
        <input
          type="range"
          min={0}
          max={safeMax}
          value={Math.min(playIndex, safeMax)}
          disabled={!canSeek}
          onChange={e => onSeek(parseInt(e.target.value, 10))}
          className="w-full accent-indigo-600 dark:accent-violet-500 cursor-pointer h-1 rounded bg-slate-200 dark:bg-zinc-800 disabled:opacity-30"
        />
      </div>

      <div className="h-6 w-[1px] bg-slate-200 dark:bg-zinc-800 hidden sm:block flex-shrink-0" />

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onSetLoopA}
          className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
            abLoop.start !== null
              ? 'bg-indigo-50 dark:bg-violet-900/40 border-indigo-200 dark:border-violet-800 text-indigo-600 dark:text-violet-400'
              : 'bg-transparent border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-700'
          }`}
          title="Set loop A (current position)"
        >
          <Flag size={14} />
          <span className="text-[9px] uppercase tracking-wider hidden sm:inline">A</span>
        </button>
        <button
          onClick={onSetLoopB}
          className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
            abLoop.end !== null
              ? 'bg-indigo-50 dark:bg-violet-900/40 border-indigo-200 dark:border-violet-800 text-indigo-600 dark:text-violet-400'
              : 'bg-transparent border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-700'
          }`}
          title="Set loop B (current position)"
        >
          <Flag size={14} />
          <span className="text-[9px] uppercase tracking-wider hidden sm:inline">B</span>
        </button>
        <button
          onClick={onToggleAbLoop}
          disabled={!canAb}
          className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-30 ${
            abLoop.enabled
              ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-transparent border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-700'
          }`}
          title="Toggle A-B loop"
        >
          <Repeat size={14} />
          <span className="text-[9px] uppercase tracking-wider hidden sm:inline">A-B</span>
        </button>
        <button
          onClick={onClearAbLoop}
          className="p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 bg-transparent border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-700"
          title="Clear A-B loop"
        >
          <FlagOff size={14} />
        </button>
      </div>

      <div className="h-6 w-[1px] bg-slate-200 dark:bg-zinc-800 hidden sm:block flex-shrink-0" />

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-none">
          {isAlphaTab ? 'Speed' : 'Tempo'}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={isAlphaTab ? '50' : '40'}
            max={isAlphaTab ? '150' : '240'}
            value={playBpm}
            onChange={e => onBpmChange(Math.max(isAlphaTab ? 50 : 40, Math.min(isAlphaTab ? 150 : 240, parseInt(e.target.value, 10) || (isAlphaTab ? 100 : 120))))}
            className="w-14 px-2 py-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-center text-xs font-bold text-slate-700 dark:text-zinc-300 outline-none"
          />
          <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">{isAlphaTab ? '%' : 'BPM'}</span>
        </div>
        <input
          type="range"
          min={isAlphaTab ? '50' : '40'}
          max={isAlphaTab ? '150' : '240'}
          value={playBpm}
          onChange={e => onBpmChange(parseInt(e.target.value, 10))}
          className="w-20 sm:w-28 accent-indigo-600 dark:accent-violet-500 cursor-pointer h-1 rounded bg-slate-200 dark:bg-zinc-800"
        />
      </div>

      <div className="h-6 w-[1px] bg-slate-200 dark:bg-zinc-800 hidden sm:block flex-shrink-0" />

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onToggleLoop}
          className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${isLooping ? 'bg-indigo-50 dark:bg-violet-900/40 border-indigo-200 dark:border-violet-800 text-indigo-600 dark:text-violet-400' : 'bg-transparent border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-700'}`}
          title="Loop Score"
        >
          <Repeat size={14} />
          <span className="text-[9px] uppercase tracking-wider hidden sm:inline">Loop</span>
        </button>
        <button
          onClick={onToggleMetronome}
          className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${isMetronomeOn ? 'bg-indigo-50 dark:bg-violet-900/40 border-indigo-200 dark:border-violet-800 text-indigo-600 dark:text-violet-400' : 'bg-transparent border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-700'}`}
          title="Metronome"
        >
          <Activity size={14} />
          <span className="text-[9px] uppercase tracking-wider hidden sm:inline">Metronome</span>
        </button>
      </div>

      <div className="h-6 w-[1px] bg-slate-200 dark:bg-zinc-800 hidden sm:block flex-shrink-0" />

      <div className="flex items-center gap-2 flex-grow sm:flex-grow-0 justify-end min-w-[80px]">
        <Volume2 size={14} className="text-slate-400 dark:text-zinc-500 flex-shrink-0" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={playbackVolume}
          onChange={e => onVolumeChange(parseFloat(e.target.value))}
          className="w-16 sm:w-24 accent-indigo-600 dark:accent-violet-500 cursor-pointer h-1 rounded bg-slate-200 dark:bg-zinc-800"
        />
      </div>
    </div>
  );
};

export default PlayerBar;
