import React, { useMemo } from 'react';

interface LeadSheetMeasureProps {
  measureNumber: number;
  chords: Array<string | null>;
  displayChords: Array<string | null>;
  lyrics: Array<string | null>;
  selectedChord: string | null;
  fontScale: number;
  onSelectChord: (name: string) => void;
}

const LeadSheetMeasure: React.FC<LeadSheetMeasureProps> = ({
  measureNumber,
  chords,
  displayChords,
  lyrics,
  selectedChord,
  fontScale,
  onSelectChord,
}) => {
  const positions = useMemo(() => {
    const columns = Array.from({ length: Math.max(16, chords.length, lyrics.length) }, (_, index) => index);
    return columns
      .filter(index => Boolean(chords[index] || lyrics[index]))
      .map((column, index, activeColumns) => ({
        column,
        span: Math.max(1, (activeColumns[index + 1] ?? 16) - column),
      }));
  }, [chords, lyrics]);

  return (
    <div className="border-b border-slate-100 px-5 py-6 last:border-b-0 dark:border-zinc-800 sm:px-7 sm:py-7">
      <div className="mb-4 text-[8px] font-semibold uppercase tracking-[0.2em] text-slate-300 dark:text-zinc-600">
        {String(measureNumber).padStart(2, '0')}
      </div>

      {positions.length > 0 ? (
        <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-y-1">
          {positions.map(({ column, span }) => {
            const originalChord = chords[column];
            const displayChord = displayChords[column] ?? originalChord;
            const lyric = lyrics[column];
            const active = Boolean(originalChord && originalChord === selectedChord);
            return (
              <div key={column} className="min-w-0 pr-2 sm:pr-4" style={{ gridColumn: `${column + 1} / span ${span}` }}>
                <div className="h-7">
                  {originalChord && displayChord && (
                    <button
                      type="button"
                      onClick={() => onSelectChord(originalChord)}
                      className={`rounded-md px-1.5 py-0.5 font-mono font-bold transition-colors ${active ? 'bg-indigo-100 text-indigo-700 dark:bg-violet-950/70 dark:text-violet-300' : 'text-indigo-600 hover:bg-indigo-50 dark:text-violet-400 dark:hover:bg-violet-950/40'}`}
                      style={{ fontSize: `${0.86 * fontScale}rem` }}
                    >
                      {displayChord}
                    </button>
                  )}
                </div>
                <div className="min-h-7 whitespace-pre-wrap font-medium leading-relaxed text-slate-800 dark:text-zinc-100" style={{ fontSize: `${1.02 * fontScale}rem` }}>
                  {lyric ?? ''}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-2 text-sm italic text-slate-300 dark:text-zinc-600">Instrumental</div>
      )}
    </div>
  );
};

export default LeadSheetMeasure;
