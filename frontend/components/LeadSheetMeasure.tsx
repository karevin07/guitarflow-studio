import React, { useMemo } from 'react';

interface LeadSheetMeasureProps {
  measureNumber: number;
  chords: Array<string | null>;
  displayChords: Array<string | null>;
  lyrics: Array<string | null>;
  selectedChord: string | null;
  fontScale: number;
  onSelectChord: (name: string) => void;
  activeColumn?: number | null;
  playbackActive?: boolean;
}

/** One bar of a songbook-style lead sheet: chords over lyrics, sized to sit four to a row. */
const LeadSheetMeasure: React.FC<LeadSheetMeasureProps> = ({
  measureNumber,
  chords,
  displayChords,
  lyrics,
  selectedChord,
  fontScale,
  onSelectChord,
  activeColumn = null,
  playbackActive = false,
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
  const hasLyrics = lyrics.some(Boolean);

  return (
    <div
      className={`relative h-full min-h-[4.25rem] px-3 pb-2.5 pt-4 transition-colors sm:px-4 ${playbackActive ? 'bg-[#edf4ef] dark:bg-emerald-950/25' : 'bg-white dark:bg-zinc-900'}`}
      data-playback-active={playbackActive || undefined}
    >
      {playbackActive && <span className="absolute inset-x-0 top-0 h-0.5 bg-[#2b6c59]" />}
      <span className="absolute left-1.5 top-1 font-mono text-[9px] text-slate-300 dark:text-zinc-600" aria-hidden="true">{measureNumber}</span>

      {positions.length > 0 ? (
        <div className="grid grid-cols-[repeat(16,minmax(0,1fr))]">
          {positions.map(({ column, span }) => {
            const originalChord = chords[column];
            const displayChord = displayChords[column] ?? originalChord;
            const lyric = lyrics[column];
            const active = Boolean(originalChord && originalChord === selectedChord);
            const playheadActive = playbackActive && activeColumn !== null && activeColumn >= column && activeColumn < column + span;
            return (
              <div key={column} className={`min-w-0 rounded-md pr-1 ${playheadActive ? 'bg-white/80 ring-1 ring-[#9bb6a8]/60 dark:bg-zinc-800/80' : ''}`} style={{ gridColumn: `${column + 1} / span ${span}` }}>
                <div className="h-6 leading-6">
                  {originalChord && displayChord && (
                    <button
                      type="button"
                      onClick={() => onSelectChord(originalChord)}
                      className={`relative -ml-1 rounded-md px-1 font-mono font-bold transition-colors after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-[''] ${active ? 'bg-indigo-100 text-indigo-700 dark:bg-violet-950/70 dark:text-violet-300' : 'text-indigo-600 hover:bg-indigo-50 dark:text-violet-400 dark:hover:bg-violet-950/40'}`}
                      style={{ fontSize: `${0.9 * fontScale}rem` }}
                    >
                      {displayChord}
                    </button>
                  )}
                </div>
                {hasLyrics && (
                  <div className="break-words font-medium leading-snug text-slate-800 dark:text-zinc-100" style={{ fontSize: `${0.98 * fontScale}rem` }}>
                    {lyric ?? ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="h-6 font-mono text-sm leading-6 tracking-[0.35em] text-slate-300 dark:text-zinc-600" aria-label="延續上一個和弦">////</div>
      )}
    </div>
  );
};

export default LeadSheetMeasure;
