
import React from 'react';
import { ChordDefinition } from '../types';

interface ChordDiagramProps {
  chord: ChordDefinition;
  size?: number;
}

const ChordDiagram: React.FC<ChordDiagramProps> = ({ chord, size = 160 }) => {
  const stringsCount = 6;
  const displayFretsCount = 5;
  const margin = 25;
  const width = size - margin * 2;
  const height = size - margin;
  const stringSpacing = width / (stringsCount - 1);
  const fretSpacing = (height - margin) / displayFretsCount;

  const numericFrets = chord.frets.filter((f): f is number => f !== null && f > 0);
  const maxFret = numericFrets.length > 0 ? Math.max(...numericFrets) : 0;
  const minFret = numericFrets.length > 0 ? Math.min(...numericFrets) : 0;
  
  let baseFret = 1;
  if (maxFret > displayFretsCount) {
    baseFret = minFret;
  }

  return (
    <div className="flex flex-col items-center bg-zinc-900/40 backdrop-blur-sm p-5 rounded-3xl border border-zinc-800/80 h-full overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <h4 className="text-xl font-bold text-zinc-100 tracking-tight leading-none truncate max-w-[120px]">{chord.name}</h4>
        {chord.name === 'Custom' && <span className="text-[9px] bg-zinc-800 text-zinc-400 border border-zinc-700/50 px-1.5 py-0.5 rounded-full font-bold">DETECTED</span>}
      </div>
      
      <div className="flex-1 flex items-center justify-center min-h-0 w-full">
        <svg width={size} height={height + 10} viewBox={`0 0 ${size} ${height + 10}`} className="overflow-visible">
          {baseFret === 1 ? (
            <line x1={margin} y1={margin} x2={size - margin} y2={margin} stroke="#5b21b6" strokeWidth="4" />
          ) : (
            <text x={margin - 12} y={margin + 12} className="fill-zinc-500 text-[10px] font-black">{baseFret}fr</text>
          )}

          {Array.from({ length: displayFretsCount }).map((_, i) => (
            <line
              key={`fret-${i}`}
              x1={margin}
              y1={margin + (i + 1) * fretSpacing}
              x2={size - margin}
              y2={margin + (i + 1) * fretSpacing}
              stroke="#27272a"
              strokeWidth="1"
            />
          ))}

          {Array.from({ length: stringsCount }).map((_, i) => (
            <line
              key={`string-${i}`}
              x1={margin + i * stringSpacing}
              y1={margin}
              x2={margin + i * stringSpacing}
              y2={height}
              stroke="#3f3f46"
              strokeWidth="1"
            />
          ))}

          {chord.frets.map((fret, sIdx) => {
            const x = margin + sIdx * stringSpacing;
            if (fret === null) {
              return (
                <text key={sIdx} x={x} y={margin - 8} textAnchor="middle" className="fill-zinc-600 text-[12px] font-bold">✕</text>
              );
            } else if (fret === 0) {
              return (
                <circle key={sIdx} cx={x} cy={margin - 10} r="4" fill="none" stroke="#a78bfa" strokeWidth="2" />
              );
            } else {
              const relativeFret = fret - baseFret + 1;
              if (relativeFret < 1 || relativeFret > displayFretsCount) return null;
              
              const y = margin + (relativeFret - 0.5) * fretSpacing;
              return (
                <g key={sIdx}>
                  <circle cx={x} cy={y} r="7" className="fill-violet-500" />
                  <text x={x} y={y + 4} textAnchor="middle" className="fill-white text-[9px] font-black">{fret}</text>
                </g>
              );
            }
          })}
        </svg>
      </div>
      
      <div className="mt-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-violet-500/50 animate-pulse" />
        Standard Tuning
      </div>
    </div>
  );
};

export default ChordDiagram;
