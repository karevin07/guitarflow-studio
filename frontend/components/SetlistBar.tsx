import React from 'react';
import { ChevronLeft, ChevronRight, ListMusic, X } from 'lucide-react';
import { LibrarySong } from '../types';
import { SetlistPosition } from '../services/songInfo';

interface SetlistBarProps {
  name: string;
  position: SetlistPosition;
  onGo: (song: LibrarySong) => void;
  onClose: () => void;
}

/** Shown while playing through a setlist: where you are and the songs either side. */
const SetlistBar: React.FC<SetlistBarProps> = ({ name, position, onGo, onClose }) => (
  <nav className="flex items-center gap-2 border-b border-[#d6e3dc] bg-[#edf4ef] px-3 py-1.5 text-xs text-[#24493d] dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200 sm:px-5" aria-label="歌單">
    <ListMusic size={15} className="shrink-0" />
    <span className="min-w-0 truncate font-semibold">{name}</span>
    <span className="shrink-0 font-mono" data-testid="setlist-position">{position.index + 1}/{position.total}</span>
    <div className="ml-auto flex min-w-0 items-center gap-1">
      <button type="button" onClick={() => position.previous && onGo(position.previous)} disabled={!position.previous} className="flex h-9 min-w-0 items-center gap-1 rounded-lg px-2 font-semibold hover:bg-white/70 disabled:opacity-30 dark:hover:bg-zinc-800" aria-label={position.previous ? `上一首：${position.previous.title}` : '上一首'}>
        <ChevronLeft size={15} className="shrink-0" /><span className="hidden sm:inline">上一首</span>
      </button>
      <button type="button" onClick={() => position.next && onGo(position.next)} disabled={!position.next} className="flex h-9 min-w-0 items-center gap-1 rounded-lg bg-white/80 px-3 font-semibold hover:bg-white disabled:opacity-40 dark:bg-zinc-800" aria-label={position.next ? `下一首：${position.next.title}` : '最後一首'}>
        <span className="max-w-[9rem] truncate sm:max-w-[16rem]">{position.next ? `下一首：${position.next.title}` : '最後一首'}</span><ChevronRight size={15} className="shrink-0" />
      </button>
      <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-white/70 dark:hover:bg-zinc-800" aria-label="離開歌單"><X size={14} /></button>
    </div>
  </nav>
);

export default SetlistBar;
