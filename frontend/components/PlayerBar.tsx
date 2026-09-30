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
  countInBeat = null,
  countInBars,
  onCountInBarsChange,
  tempoTrainer,
  onTempoTrainerChange,
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
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-zinc-500">
            <span className={countInBeat !== null ? 'font-bold text-[#2b6c59] dark:text-emerald-400' : ''} aria-live="polite">{countInBeat !== null ? `預備 ${countInBeat}` : isPlaying ? '播放中' : isPaused ? '已暫停' : '準備好了'}</span>
            <span className="font-mono tracking-normal">{seekLabel}</span>
          </div>
          <input type="range" min={0} max={safeMax} value={Math.min(playIndex, safeMax)} disabled={totalCols <= 1} onChange={event => onSeek(Number(event.target.value))} className="block h-1 w-full cursor-pointer accent-indigo-600 disabled:opacity-30 dark:accent-violet-500" aria-label="Playback position" />
        </div>

        <div className="hidden shrink-0 items-center rounded-xl bg-slate-100 p-1 dark:bg-zinc-800 sm:flex">
          <button type="button" onClick={() => nudgeTempo(-5)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white dark:text-zinc-400 dark:hover:bg-zinc-700" aria-label="Decrease tempo"><Minus size={13} /></button>
          <div className="min-w-16 px-2 text-center">
            <div className="font-mono text-xs font-bold text-slate-800 dark:text-zinc-100">{playBpm}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{isAlphaTab ? '速度 %' : 'BPM'}</div>
          </div>
          <button type="button" onClick={() => nudgeTempo(5)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white dark:text-zinc-400 dark:hover:bg-zinc-700" aria-label="Increase tempo"><Plus size={13} /></button>
        </div>

        <button type="button" onClick={() => setControlsOpen(value => !value)} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors ${controlsOpen ? 'bg-indigo-50 text-indigo-700 dark:bg-violet-950/50 dark:text-violet-300' : 'text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800'}`} aria-label="Playback controls" aria-expanded={controlsOpen}>
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
            <button type="button" onClick={onSetLoopA} className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold uppercase tracking-wider ${abLoop.start !== null ? 'bg-indigo-50 text-indigo-700 dark:bg-violet-950/50 dark:text-violet-300' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}><Flag size={13} /> A</button>
            <button type="button" onClick={onSetLoopB} className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold uppercase tracking-wider ${abLoop.end !== null ? 'bg-indigo-50 text-indigo-700 dark:bg-violet-950/50 dark:text-violet-300' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}><Flag size={13} /> B</button>
            <button type="button" onClick={onToggleAbLoop} disabled={!canAb} className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold uppercase tracking-wider disabled:opacity-30 ${abLoop.enabled ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}><Repeat size={13} /> A–B</button>
            <button type="button" onClick={onClearAbLoop} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-zinc-800" aria-label="Clear A-B loop"><FlagOff size={13} /></button>
            <button type="button" onClick={onToggleLoop} className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold uppercase tracking-wider ${isLooping ? 'bg-indigo-50 text-indigo-700 dark:bg-violet-950/50 dark:text-violet-300' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}><Repeat size={13} /> 循環</button>
            <button type="button" onClick={onToggleMetronome} className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold uppercase tracking-wider ${isMetronomeOn ? 'bg-indigo-50 text-indigo-700 dark:bg-violet-950/50 dark:text-violet-300' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}><Activity size={13} /> 節拍器</button>
          </div>

          <label className="flex min-w-32 items-center gap-2">
            <Volume2 size={14} className="shrink-0 text-slate-400" />
            <input type="range" min="0" max="1" step="0.05" value={playbackVolume} onChange={event => onVolumeChange(Number(event.target.value))} className="h-1 min-w-0 flex-1 accent-indigo-600 dark:accent-violet-500" aria-label="Playback volume" />
          </label>

          {countInBars !== undefined && onCountInBarsChange && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-300 md:col-span-3">
              <span className="w-16 shrink-0">預備拍</span>
              <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-zinc-800" role="radiogroup" aria-label="預備拍">
                {[0, 1, 2].map(bars => (
                  <button key={bars} type="button" role="radio" aria-checked={countInBars === bars} onClick={() => onCountInBarsChange(bars)} className={`h-8 rounded-md px-3 ${countInBars === bars ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100' : 'text-slate-500 dark:text-zinc-400'}`}>
                    {bars === 0 ? '不用' : `${bars} 小節`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tempoTrainer && onTempoTrainerChange && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-300 md:col-span-3">
              <label className="flex w-16 shrink-0 items-center gap-1.5">
                <input type="checkbox" checked={tempoTrainer.enabled} onChange={event => onTempoTrainerChange({ ...tempoTrainer, enabled: event.target.checked, target: Math.max(tempoTrainer.target, playBpm) })} className="accent-[#2b6c59]" aria-label="漸進加速" />
                加速
              </label>
              <span className="text-slate-500 dark:text-zinc-400">每循環一次</span>
              <select value={tempoTrainer.step} onChange={event => onTempoTrainerChange({ ...tempoTrainer, step: Number(event.target.value) })} className="h-8 rounded-md bg-slate-100 px-2 dark:bg-zinc-800" aria-label="每次加快">
                {[2, 5, 10].map(step => <option key={step} value={step}>+{step}</option>)}
              </select>
              <span className="text-slate-500 dark:text-zinc-400">BPM，到</span>
              <input type="number" min={minimumTempo} max={maximumTempo} value={tempoTrainer.target} onChange={event => onTempoTrainerChange({ ...tempoTrainer, target: Math.max(minimumTempo, Math.min(maximumTempo, Number(event.target.value) || tempoTrainer.target)) })} className="h-8 w-16 rounded-md bg-slate-100 px-2 font-mono dark:bg-zinc-800" aria-label="目標速度" />
              <span className="text-slate-500 dark:text-zinc-400">為止{!isLooping && !abLoop.enabled ? '（要開啟循環才會加速）' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerBar;
