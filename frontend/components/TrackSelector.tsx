import React from 'react';
import { Layers } from 'lucide-react';
import { AlphaTabTrackInfo } from '../types/alphatab';

interface TrackSelectorProps {
  tracks: AlphaTabTrackInfo[];
  selected: number[];
  onToggle: (index: number) => void;
  onSelectAll: () => void;
  onSelectGuitar: () => void;
}

const TrackSelector: React.FC<TrackSelectorProps> = ({
  tracks,
  selected,
  onToggle,
  onSelectAll,
  onSelectGuitar,
}) => {
  if (tracks.length <= 1) return null;

  return (
    <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/50">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 shrink-0">
          <Layers size={14} />
          Tracks
        </div>
        <div className="flex flex-wrap gap-2 flex-1">
          {tracks.map(track => {
            const active = selected.includes(track.index);
            return (
              <button
                key={track.index}
                type="button"
                onClick={() => onToggle(track.index)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  active
                    ? 'bg-indigo-50 dark:bg-violet-900/40 border-indigo-300 dark:border-violet-700 text-indigo-700 dark:text-violet-300'
                    : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-500 hover:border-indigo-300 dark:hover:border-violet-700'
                }`}
                title={track.name}
              >
                {track.shortName || track.name}
                {track.isPercussion && (
                  <span className="ml-1.5 text-[9px] font-semibold uppercase opacity-60">Drums</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onSelectGuitar}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:border-indigo-300 dark:hover:border-violet-700 hover:text-indigo-600 dark:hover:text-violet-400 transition-all"
          >
            Guitar
          </button>
          <button
            type="button"
            onClick={onSelectAll}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:border-indigo-300 dark:hover:border-violet-700 hover:text-indigo-600 dark:hover:text-violet-400 transition-all"
          >
            All
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrackSelector;
