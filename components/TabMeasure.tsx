
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

  return (
    <div className="flex-shrink-0 bg-white border-r-2 border-slate-300 p-2 group relative transition-all">
      {/* Chord names row */}
      <div className="flex items-center h-8 mb-1 font-sans text-[10px] font-bold text-orange-600">
        <span className="w-4 mr-2"></span>
        <div className="flex">
          {chords.map((chord, cIdx) => (
            <div 
              key={cIdx} 
              className={`relative group/col transition-colors rounded 
                ${dragOverCol === cIdx ? 'bg-orange-100 ring-2 ring-orange-400' : ''}
                ${isPrimaryBeat(cIdx) && dragOverCol !== cIdx ? 'bg-slate-50' : ''}
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
                className={`w-6 h-6 flex items-center justify-center rounded text-center bg-transparent border-none outline-none hover:bg-orange-50 transition-colors focus:bg-orange-100 focus:text-orange-700 placeholder:text-slate-200 ${activeCol === cIdx ? 'bg-orange-50 shadow-inner' : ''}`}
              />
              
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onClearColumn?.(cIdx);
                }}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/col:opacity-100 hover:bg-red-600 transition-all z-20 shadow-sm"
                title="Clear Chord/Beat"
              >
                <X size={8} strokeWidth={4} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-0">
        {measure.map((stringData, sIdx) => (
          <div key={sIdx} className="flex items-center h-6 font-mono text-sm group/line">
            <span className="w-4 text-xs font-bold text-slate-400 mr-2 uppercase">{TUNING_STANDARD[sIdx]}</span>
            <div className="flex border-b border-slate-100">
              {stringData.map((note, cIdx) => (
                <button
                  key={cIdx}
                  onClick={() => onCellClick(sIdx, cIdx)}
                  onDragOver={(e) => handleDragOver(e, cIdx)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, cIdx)}
                  className={`w-6 h-6 flex items-center justify-center transition-colors
                    ${activeString === sIdx && activeCol === cIdx ? 'bg-orange-100 text-orange-600 font-bold ring-1 ring-orange-500' : 'hover:bg-slate-50'}
                    ${activeCol === cIdx ? 'bg-slate-50/50' : ''}
                    ${dragOverCol === cIdx ? 'bg-orange-50' : ''}
                    ${isPrimaryBeat(cIdx) && activeCol !== cIdx && dragOverCol !== cIdx ? 'bg-slate-50' : ''}
                  `}
                >
                  {note === '-' ? '·' : note}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Lyrics row */}
      <div className="mt-2 flex items-center h-10">
        <span className="w-4 mr-2 flex items-center justify-center text-slate-300">
          <MessageSquare size={10} />
        </span>
        <div className="flex">
          {lyrics.map((lyric, cIdx) => (
            <div 
              key={cIdx} 
              className={`w-6 h-8 relative group/lyric ${isPrimaryBeat(cIdx) ? 'bg-slate-50/50' : ''}`}
            >
              <input
                type="text"
                value={lyric || ''}
                onChange={(e) => onLyricChange?.(cIdx, e.target.value)}
                placeholder="..."
                className={`w-full h-full bg-transparent text-[9px] font-bold text-slate-500 text-center border-b border-dashed border-slate-100 focus:border-orange-500 outline-none transition-all placeholder:text-transparent hover:placeholder:text-slate-200 ${lyric ? 'border-orange-200' : ''}`}
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-3 flex items-center justify-between px-1">
        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
          Measure
          <div className="flex gap-0.5">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="w-1 h-1 rounded-full bg-slate-200" />
            ))}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); onCopy?.(); }}
            title="Copy Measure"
            className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
          >
            <Copy size={12} />
          </button>
          {canDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              title="Delete Measure"
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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
