import React from 'react';

interface SoloTabViewProps {
  measures: string[][][];
  /** Chord symbols to show above each measure (already spelled for display). */
  chords: Array<Array<string | null>>;
  lyrics: Array<Array<string | null>>;
  /** Absolute column (measure * 16 + col) sounding now, or null. */
  playCol: number | null;
}

const COLS = 16;
const STRING_NAMES = ['e', 'B', 'G', 'D', 'A', 'E'];

const columnLeft = (col: number) => `${((col + 0.5) / COLS) * 100}%`;

/** Read-only tab: chords on top, six strings with only the played frets, lyrics below. */
const SoloTabView: React.FC<SoloTabViewProps> = ({ measures, chords, lyrics, playCol }) => (
  <div className="grid gap-x-0 gap-y-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="solo-tab">
    {measures.map((measure, measureIdx) => {
      const activeCol = playCol !== null && Math.floor(playCol / COLS) === measureIdx ? playCol % COLS : null;
      const chordCells = (chords[measureIdx] ?? []).flatMap((symbol, col) => (symbol ? [{ col, symbol }] : []));
      const lyricCells = (lyrics[measureIdx] ?? []).flatMap((text, col) => (text ? [{ col, text }] : []));
      return (
        <div key={measureIdx} className="relative min-w-0 border-l border-[#c9c7bf] pl-5 pr-2 dark:border-zinc-700" aria-label={`第 ${measureIdx + 1} 小節`}>
          <span className="absolute left-1 top-0 font-mono text-[9px] text-[#b3b1a9]">{measureIdx + 1}</span>
          <div className="relative h-6">
            {chordCells.map(({ col, symbol }) => (
              <span key={col} className="absolute top-0 -translate-x-1/2 font-mono text-xs font-bold text-[#4d5bd2] dark:text-violet-400" style={{ left: columnLeft(col) }}>
                {symbol}
              </span>
            ))}
          </div>
          <div className="relative">
            {activeCol !== null && (
              <span className="absolute inset-y-0 z-0 w-[6.25%] -translate-x-1/2 rounded bg-[#fbecc4] dark:bg-amber-900/40" style={{ left: columnLeft(activeCol) }} />
            )}
            {STRING_NAMES.map((name, stringIndex) => (
              <div key={name} className="relative h-5">
                <span className="absolute -left-4 top-1/2 -translate-y-1/2 font-mono text-[9px] text-[#b3b1a9]">{name}</span>
                <span className="absolute inset-x-0 top-1/2 h-px bg-[#d6d4cc] dark:bg-zinc-700" />
                {measure[stringIndex]?.map((cell, col) => (
                  cell && cell !== '-' ? (
                    <span
                      key={col}
                      className={`absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded bg-[#fffefa] px-0.5 font-mono text-[11px] font-bold leading-none dark:bg-zinc-900 ${activeCol === col ? 'text-[#b7791f] dark:text-amber-300' : 'text-[#171a18] dark:text-zinc-100'}`}
                      style={{ left: columnLeft(col) }}
                    >
                      {cell}
                    </span>
                  ) : null
                ))}
              </div>
            ))}
          </div>
          <div className="relative mt-1 h-5 overflow-hidden">
            {lyricCells.map(({ col, text }) => (
              <span key={col} title={text} className="absolute top-0 max-w-[60%] truncate text-[10px] text-[#85877f]" style={{ left: `${(col / COLS) * 100}%` }}>
                {text}
              </span>
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

export default SoloTabView;
