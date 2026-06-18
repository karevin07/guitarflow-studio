import React, { useEffect, useRef } from 'react';
import { SVGuitarChord } from 'svguitar';
import { ChordDefinition } from '../types';

interface ChordDiagramProps {
  chord: ChordDefinition;
  size?: number;
}

const ChordDiagram: React.FC<ChordDiagramProps> = ({ chord, size = 160 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous SVG
    containerRef.current.innerHTML = '';

    // Calculate base fret
    const numericFrets = chord.frets.filter((f): f is number => f !== null && f > 0);
    const maxFret = numericFrets.length > 0 ? Math.max(...numericFrets) : 0;
    const minFret = numericFrets.length > 0 ? Math.min(...numericFrets) : 0;
    
    let baseFret = 1;
    if (maxFret > 5) {
      baseFret = minFret;
    }

    // Map fingers
    // e, B, G, D, A, E index: 0 is High E (string 1), 5 is Low E (string 6)
    const fingers: any[] = [];
    chord.frets.forEach((fret, index) => {
      // In svguitar:
      // index 0 -> High E -> string 1
      // index 5 -> Low E -> string 6
      const stringNum = index + 1; // 1 to 6
      if (fret === null) {
        fingers.push([stringNum, 'x']);
      } else if (fret === 0) {
        fingers.push([stringNum, 0]);
      } else {
        fingers.push([stringNum, fret]);
      }
    });

    const chart = new SVGuitarChord(containerRef.current);

    // Apply premium dark theme colors to SVGuitar configuration
    chart.configure({
      strings: 6,
      frets: 5,
      position: baseFret,
      tuning: ['E', 'A', 'D', 'G', 'B', 'e'], // left to right (6 to 1)
      backgroundColor: 'transparent',
      color: '#a78bfa',            // violet-400 global default (circles stroke etc)
      fretColor: '#27272a',        // zinc-800 fret lines
      stringColor: '#3f3f46',      // zinc-700 string lines
      fretLabelColor: '#71717a',   // zinc-500 position labels (3fr)
      tuningsColor: '#52525b',     // zinc-500 tuning labels at the bottom
      fingerColor: '#8b5cf6',      // violet-500 finger fill
      fingerTextColor: '#ffffff',  // white text inside fingers
      fingerTextSize: 11,
      strokeWidth: 2,
      emptyStringIndicatorSize: 0.6,
      sidePadding: 0.15,
    });

    chart.chord({
      fingers,
      barres: [],
    });

    try {
      chart.draw();
    } catch (err) {
      console.error('Failed to draw svguitar chord:', err);
    }
  }, [chord]);

  return (
    <div className="flex flex-col items-center bg-zinc-900/40 backdrop-blur-sm p-5 rounded-3xl border border-zinc-800/80 h-full overflow-hidden shadow-2xl w-full">
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <h4 className="text-xl font-bold text-zinc-100 tracking-tight leading-none truncate max-w-[120px]">{chord.name}</h4>
        {chord.name === 'Custom' && <span className="text-[9px] bg-zinc-800 text-zinc-400 border border-zinc-700/50 px-1.5 py-0.5 rounded-full font-bold">DETECTED</span>}
      </div>
      
      <div className="flex-1 flex items-center justify-center min-h-0 w-full relative">
        <div ref={containerRef} style={{ width: `${size}px`, height: `${size + 20}px` }} className="overflow-visible flex items-center justify-center svguitar-container" />
      </div>
      
      <div className="mt-2 text-[10px] font-bold text-zinc-550 uppercase tracking-widest flex items-center gap-2 flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-violet-500/50 animate-pulse" />
        Standard Tuning
      </div>
    </div>
  );
};

export default ChordDiagram;
