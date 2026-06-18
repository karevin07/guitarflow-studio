import React, { useEffect, useRef } from 'react';
import { SVGuitarChord } from 'svguitar';
import { ChordDefinition } from '../types';

interface ChordDiagramProps {
  chord: ChordDefinition;
  size?: number;
  theme?: 'light' | 'dark';
}

const ChordDiagram: React.FC<ChordDiagramProps> = ({ chord, size = 160, theme }) => {
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
    const fingers: any[] = [];
    chord.frets.forEach((fret, index) => {
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
    const isDark = theme === 'dark' || document.documentElement.classList.contains('dark');

    // Apply premium dark/light theme colors to SVGuitar configuration
    chart.configure({
      strings: 6,
      frets: 5,
      position: baseFret,
      tuning: ['E', 'A', 'D', 'G', 'B', 'e'], // left to right (6 to 1)
      backgroundColor: 'transparent',
      color: isDark ? '#a78bfa' : '#6366f1',            // violet-400 vs indigo-500
      fretColor: isDark ? '#27272a' : '#e2e8f0',        // zinc-800 vs slate-200
      stringColor: isDark ? '#3f3f46' : '#cbd5e1',      // zinc-700 vs slate-300
      fretLabelColor: isDark ? '#71717a' : '#64748b',   // zinc-500 vs slate-500
      tuningsColor: isDark ? '#52525b' : '#64748b',     // zinc-650 vs slate-500
      fingerColor: isDark ? '#8b5cf6' : '#4f46e5',      // violet-500 vs indigo-600
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
  }, [chord, theme]);

  const isDark = theme === 'dark' || document.documentElement.classList.contains('dark');

  return (
    <div className="flex flex-col items-center bg-white dark:bg-zinc-900/40 backdrop-blur-sm p-5 rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 h-full overflow-hidden shadow-md dark:shadow-2xl w-full transition-all">
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <h4 className="text-xl font-bold text-slate-800 dark:text-zinc-100 tracking-tight leading-none truncate max-w-[120px]">{chord.name}</h4>
        {chord.name === 'Custom' && <span className="text-[9px] bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-250/50 dark:border-zinc-700/50 px-1.5 py-0.5 rounded-full font-bold">DETECTED</span>}
      </div>
      
      <div className="flex-1 flex items-center justify-center min-h-0 w-full relative">
        <div ref={containerRef} style={{ width: `${size}px`, height: `${size + 20}px` }} className="overflow-visible flex items-center justify-center svguitar-container" />
      </div>
      
      <div className="mt-2 text-[10px] font-bold text-slate-400 dark:text-zinc-555 uppercase tracking-widest flex items-center gap-2 flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 dark:bg-violet-500/50 animate-pulse" />
        Standard Tuning
      </div>
    </div>
  );
};

export default ChordDiagram;
