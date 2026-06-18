
import React, { useState } from 'react';
import { TUNING_STANDARD } from '../constants';
import { Copy, Trash2, X, MessageSquare } from 'lucide-react';

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
  canDelete = true
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

  const renderNote = (note: string) => {
    if (note === '-' || note === '·') return <span className="text-zinc-700 font-semibold">•</span>;
    
    // Check if the note contains a slide
    const hasSlide = note.includes('s') || note.includes('/');
    if (hasSlide) {
      const parts = note.split(/([s/])/);
      return (
        <span className="text-violet-400 font-bold">
          {parts[0]}
          <span className="text-fuchsia-400 italic font-bold text-[10px] ml-[1px]">{parts[1]}</span>
        </span>
      );
    }
    
    return <span className="text-zinc-200 font-bold">{note}</span>;
  };

  return (
    <div className="flex-shrink-0 bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl group relative transition-all duration-300 hover:border-zinc-700/60 shadow-xl">
      {/* Chord names row */}
      <div className="flex items-center h-8 mb-2 font-sans text-[10px] font-bold text-violet-400">
        <span className="w-4 mr-2"></span>
        <div className="flex">
          {chords.map((chord, cIdx) => (
            <div 
              key={cIdx} 
              className={`relative group/col transition-colors rounded 
                ${dragOverCol === cIdx ? 'bg-violet-950/45 ring-2 ring-violet-500/50' : ''}
                ${isPrimaryBeat(cIdx) && dragOverCol !== cIdx ? 'bg-zinc-850/40' : ''}
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
                className={`w-6 h-6 flex items-center justify-center rounded text-center bg-transparent border-none outline-none hover:bg-zinc-850 transition-colors focus:bg-zinc-800 focus:text-violet-400 placeholder:text-zinc-700 ${activeCol === cIdx ? 'bg-violet-500/10 text-violet-400' : ''}`}
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
            <span className="w-4 text-xs font-bold text-zinc-500 mr-2 uppercase">{TUNING_STANDARD[sIdx]}</span>
            <div className="flex border-b border-zinc-800/40">
              {stringData.map((note, cIdx) => (
                <button
                  key={cIdx}
                  onClick={() => onCellClick(sIdx, cIdx)}
                  onDragOver={(e) => handleDragOver(e, cIdx)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, cIdx)}
                  className={`w-6 h-6 flex items-center justify-center transition-all overflow-visible
                    ${activeString === sIdx && activeCol === cIdx ? 'bg-gradient-to-tr from-violet-600 to-indigo-650 text-white font-bold ring-2 ring-violet-500 z-10 shadow-lg shadow-violet-500/35 scale-110 rounded' : 'hover:bg-zinc-800/80 rounded'}
                    ${activeCol === cIdx && !(activeString === sIdx) ? 'bg-violet-500/5' : ''}
                    ${dragOverCol === cIdx ? 'bg-violet-950/20' : ''}
                    ${isPrimaryBeat(cIdx) && activeCol !== cIdx && dragOverCol !== cIdx ? 'bg-zinc-850/25' : ''}
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
        <span className="w-4 mr-2 flex items-center justify-center text-zinc-650">
          <MessageSquare size={10} />
        </span>
        <div className="flex">
          {lyrics.map((lyric, cIdx) => (
            <div 
              key={cIdx} 
              className={`w-6 h-8 relative group/lyric ${isPrimaryBeat(cIdx) ? 'bg-zinc-850/15' : ''}`}
            >
              <input
                type="text"
                value={lyric || ''}
                onChange={(e) => onLyricChange?.(cIdx, e.target.value)}
                placeholder="..."
                className={`w-full h-full bg-transparent text-[9px] font-bold text-zinc-300 text-center border-b border-dashed border-zinc-800 focus:border-violet-500 focus:text-violet-400 outline-none transition-all placeholder:text-transparent hover:placeholder:text-zinc-600 ${lyric ? 'border-violet-500/30 text-violet-300' : ''}`}
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between px-1">
        <div className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest flex items-center gap-2">
          Measure
          <div className="flex gap-0.5">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="w-1 h-1 rounded-full bg-zinc-850" />
            ))}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button 
            onClick={(e) => { e.stopPropagation(); onCopy?.(); }}
            title="Copy Measure"
            className="p-1.5 text-zinc-500 hover:text-violet-400 hover:bg-zinc-800 rounded-lg transition-all"
          >
            <Copy size={12} />
          </button>
          {canDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              title="Delete Measure"
              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all"
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
