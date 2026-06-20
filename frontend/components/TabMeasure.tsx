
import React, { useState } from 'react';
import { TUNING_STANDARD } from '../constants';
import { Copy, Trash2, X, MessageSquare } from 'lucide-react';
import { renderTabNote } from '../services/tabNotation';

interface TabMeasureProps {
  measure: string[][];
  chords: (string | null)[];
  lyrics: (string | null)[];
  activeCol: number | null;
  activeString: number | null;
  onCellClick: (stringIdx: number, colIdx: number) => void;
  onChordClick?: (colIdx: number) => void;
  onChordNameChange?: (colIdx: number, name: string) => void;
  onLyricChange?: (colIdx: number, text: string) => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onClearColumn?: (colIdx: number) => void;
  onDropChord?: (colIdx: number, chordName: string) => void;
  canDelete?: boolean;
  theme?: 'light' | 'dark';
  playCol?: number | null;
}

const TabMeasure: React.FC<TabMeasureProps> = ({ 
  measure, 
  chords,
  lyrics,
  activeCol, 
  activeString, 
  onCellClick,
  onChordClick,
  onChordNameChange,
  onLyricChange,
  onDelete,
  onCopy,
  onClearColumn,
  onDropChord,
  canDelete = true,
  theme = 'dark',
  playCol = null
}) => {
  const [dragOverCol, setDragOverCol] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent, cIdx: number) => {
    e.preventDefault();
    setDragOverCol(cIdx);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e: React.DragEvent, cIdx: number) => {
    e.preventDefault();
    setDragOverCol(null);
    const chordName = e.dataTransfer.getData('chordName');
    if (chordName && onDropChord) {
      onDropChord(cIdx, chordName);
    }
  };

  // Helper to determine if a column is a primary beat (1, 2, 3, 4)
  const isPrimaryBeat = (cIdx: number) => cIdx % 4 === 0;

  const renderNote = (note: string) => renderTabNote(note);

  return (
    <div className="flex-shrink-0 bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 p-4 rounded-2xl group relative transition-all duration-300 hover:border-slate-300 dark:hover:border-zinc-700/60 shadow-md dark:shadow-xl">
      {/* Chord names row */}
      <div className="flex items-center h-8 mb-2 font-sans text-[10px] font-bold text-indigo-600 dark:text-violet-400">
        <span className="w-4 mr-2"></span>
        <div className="flex">
          {chords.map((chord, cIdx) => (
            <div 
              key={cIdx} 
              className={`relative group/col transition-colors rounded 
                ${dragOverCol === cIdx ? 'bg-indigo-50 dark:bg-violet-900/45 ring-2 ring-indigo-500/50 dark:ring-violet-500/50' : ''}
                ${isPrimaryBeat(cIdx) && dragOverCol !== cIdx ? 'bg-slate-50 dark:bg-zinc-800/40' : ''}
                ${playCol === cIdx ? 'bg-emerald-500/10 dark:bg-emerald-500/20 ring-1 ring-emerald-500/40 shadow-sm' : ''}
              `}
              onDragOver={(e) => handleDragOver(e, cIdx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, cIdx)}
            >
              <input
                type="text"
                value={chord || ''}
                onChange={(e) => onChordNameChange?.(cIdx, e.target.value)}
                onFocus={() => onChordClick?.(cIdx)}
                placeholder="-"
                className={`w-6 h-6 flex items-center justify-center rounded text-center bg-transparent border-none outline-none hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors focus:bg-slate-200 dark:focus:bg-zinc-800 focus:text-indigo-600 dark:focus:text-violet-400 placeholder:text-slate-300 dark:placeholder:text-zinc-700 ${activeCol === cIdx ? 'bg-indigo-500/10 text-indigo-600 dark:bg-violet-500/10 dark:text-violet-400' : ''}`}
              />
              
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onClearColumn?.(cIdx);
                }}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/col:opacity-100 hover:bg-red-600 transition-all z-20 shadow-md"
                title="Clear Chord/Beat"
              >
                <X size={8} strokeWidth={4} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        {measure.map((stringData, sIdx) => (
          <div key={sIdx} className="flex items-center h-6 font-mono text-sm group/line">
            <span className="w-4 text-xs font-bold text-slate-400 dark:text-zinc-500 mr-2 uppercase">{TUNING_STANDARD[sIdx]}</span>
            <div className="flex border-b border-slate-100 dark:border-zinc-800/40">
              {stringData.map((note, cIdx) => (
                <button
                  key={cIdx}
                  onClick={() => onCellClick(sIdx, cIdx)}
                  onDragOver={(e) => handleDragOver(e, cIdx)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, cIdx)}
                  className={`w-6 h-6 flex items-center justify-center transition-all overflow-visible
                    ${activeString === sIdx && activeCol === cIdx ? 'bg-gradient-to-tr from-indigo-600 to-violet-650 dark:from-violet-600 dark:to-indigo-650 text-white font-bold ring-2 ring-indigo-500 dark:ring-violet-500 z-10 shadow-lg shadow-indigo-500/20 dark:shadow-violet-500/35 scale-110 rounded' : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 rounded'}
                    ${activeCol === cIdx && !(activeString === sIdx) ? 'bg-indigo-500/5 dark:bg-violet-500/5' : ''}
                    ${dragOverCol === cIdx ? 'bg-indigo-500/10 dark:bg-violet-900/20' : ''}
                    ${isPrimaryBeat(cIdx) && activeCol !== cIdx && dragOverCol !== cIdx && playCol !== cIdx ? 'bg-slate-100/40 dark:bg-zinc-800/25' : ''}
                    ${playCol === cIdx && !(activeString === sIdx && activeCol === cIdx) ? 'bg-emerald-500/20 dark:bg-emerald-500/30 border-x border-emerald-500/30' : ''}
                  `}
                >
                  {renderNote(note)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Lyrics row */}
      <div className="mt-3 flex items-center h-10">
        <span className="w-4 mr-2 flex items-center justify-center text-slate-400 dark:text-zinc-600">
          <MessageSquare size={10} />
        </span>
        <div className="flex">
          {lyrics.map((lyric, cIdx) => (
            <div 
              key={cIdx} 
              className={`w-6 h-8 relative group/lyric 
                ${isPrimaryBeat(cIdx) ? 'bg-slate-50/30 dark:bg-zinc-800/15' : ''}
                ${playCol === cIdx ? 'bg-emerald-500/10 dark:bg-emerald-500/20 shadow-sm' : ''}
              `}
            >
              <input
                type="text"
                value={lyric || ''}
                onChange={(e) => onLyricChange?.(cIdx, e.target.value)}
                placeholder="..."
                className={`w-full h-full bg-transparent text-[9px] font-bold text-slate-600 dark:text-zinc-300 text-center border-b border-dashed border-slate-200 dark:border-zinc-800 focus:border-indigo-500 focus:text-indigo-600 dark:focus:border-violet-500 dark:focus:text-violet-400 outline-none transition-all placeholder:text-transparent hover:placeholder:text-slate-400 dark:hover:placeholder:text-zinc-600 ${lyric ? 'border-indigo-500/35 text-indigo-600 dark:border-violet-500/30 dark:text-violet-300' : ''}`}
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between px-1">
        <div className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          Measure
          <div className="flex gap-0.5">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="w-1 h-1 rounded-full bg-slate-200 dark:bg-zinc-800" />
            ))}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button 
            onClick={(e) => { e.stopPropagation(); onCopy?.(); }}
            title="Copy Measure"
            className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-violet-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
          >
            <Copy size={12} />
          </button>
          {canDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              title="Delete Measure"
              className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default TabMeasure;
