import React from 'react';
import { PitchClass } from '../music-theory';
import { STANDARD_TUNING, noteAt } from '../guitar';
import { FretMark, FretMarkRole } from '../services/soloGuide';

interface SoloFretboardProps {
  /** Mark for each pitch class (0-11); null hides the pitch. */
  marks: Array<FretMark | null>;
  /** Pitches to ring as landing targets. */
  targets?: ReadonlySet<PitchClass>;
  /** Frets outside this range are dimmed. */
  window?: { from: number; to: number } | null;
  /** When set, only these "string:fret" positions are shown (e.g. a pentatonic box). */
  only?: ReadonlySet<string> | null;
  maxFret?: number;
  onPlayNote?: (stringIndex: number, fret: number) => void;
}

const STRING_NAMES = ['e', 'B', 'G', 'D', 'A', 'E'];
const STRING_WEIGHTS = [1, 1.25, 1.5, 2, 2.5, 3];
const SINGLE_INLAYS = new Set([3, 5, 7, 9, 15]);

const ROLE_STYLES: Record<FretMarkRole, string> = {
  root: 'bg-[#4d5bd2] text-white border-[#4d5bd2] dark:bg-violet-500 dark:border-violet-500',
  third: 'bg-[#2b6c59] text-white border-[#2b6c59] dark:bg-emerald-500 dark:border-emerald-500 dark:text-zinc-950',
  seventh: 'bg-[#2b6c59] text-white border-[#2b6c59] dark:bg-emerald-500 dark:border-emerald-500 dark:text-zinc-950',
  fifth: 'bg-[#dfe2fb] text-[#343f9e] border-[#bfc2e8] dark:bg-violet-950 dark:text-violet-200 dark:border-violet-800',
  tension: 'bg-[#fbf1dc] text-[#8a5a12] border-[#ecd29c] dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
  passing: 'bg-[#fffefa] text-[#9a9c95] border-dashed border-[#c9c7bf] dark:bg-zinc-900 dark:text-zinc-500 dark:border-zinc-700',
  scale: 'bg-[#efede7] text-[#3d403a] border-[#d6d4cc] dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
};

export const FRET_MARK_LEGEND: Array<{ role: FretMarkRole; label: string }> = [
  { role: 'root', label: '根音' },
  { role: 'third', label: '3 度 / 7 度（引導音）' },
  { role: 'fifth', label: '5 度' },
  { role: 'tension', label: '延伸音' },
  { role: 'passing', label: '經過音（弱拍用）' },
  { role: 'scale', label: '音階音' },
];

export const FretMarkSwatch: React.FC<{ role: FretMarkRole }> = ({ role }) => (
  <span className={`inline-block h-3.5 w-3.5 rounded-full border ${ROLE_STYLES[role]}`} />
);

const SoloFretboard: React.FC<SoloFretboardProps> = ({
  marks,
  targets,
  window,
  only = null,
  maxFret = 15,
  onPlayNote,
}) => {
  const frets = Array.from({ length: maxFret + 1 }, (_, fret) => fret);
  const columns = `2.5rem repeat(${maxFret}, minmax(2.6rem, 1fr))`;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#dedcd4] bg-[#fffefa] dark:border-zinc-800 dark:bg-zinc-900" data-testid="solo-fretboard">
      <div className="min-w-[720px] px-3 pb-3 pt-4">
        {STANDARD_TUNING.strings.map((openString, stringIndex) => (
          <div key={stringIndex} className="grid h-10 items-center" style={{ gridTemplateColumns: columns }}>
            {frets.map(fret => {
              const pitch = noteAt(openString, fret);
              const mark = marks[pitch];
              const visible = mark && (!only || only.has(`${stringIndex}:${fret}`));
              const dimmed = window && (fret < window.from || fret > window.to);
              const isTarget = visible && targets?.has(pitch);
              return (
                <div
                  key={fret}
                  className={`relative flex h-full items-center justify-center ${fret === 0 ? 'border-r-4 border-[#c9c7bf] dark:border-zinc-600' : 'border-r border-[#dedcd4] dark:border-zinc-700'} ${window && !dimmed ? 'bg-[#f3f1eb] dark:bg-zinc-800/50' : ''}`}
                >
                  {fret > 0 && (
                    <span
                      className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-[#b9b7af] dark:bg-zinc-600"
                      style={{ height: `${STRING_WEIGHTS[stringIndex]}px` }}
                    />
                  )}
                  {fret === 0 && !visible && (
                    <span className="font-mono text-[10px] font-semibold text-[#9a9c95]">{STRING_NAMES[stringIndex]}</span>
                  )}
                  {visible && (
                    <button
                      type="button"
                      onClick={() => onPlayNote?.(stringIndex, fret)}
                      className={`relative z-10 grid h-7 min-w-7 place-items-center rounded-full border px-1 font-mono text-[10px] font-bold transition-transform hover:scale-110 ${ROLE_STYLES[mark.role]} ${dimmed ? 'opacity-25' : ''} ${isTarget ? 'ring-2 ring-offset-2 ring-[#2b6c59] ring-offset-[#fffefa] dark:ring-emerald-400 dark:ring-offset-zinc-900' : ''}`}
                      aria-label={`${STRING_NAMES[stringIndex]} 弦第 ${fret} 格 ${mark.label}`}
                    >
                      {mark.label}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div className="mt-2 grid" style={{ gridTemplateColumns: columns }}>
          {frets.map(fret => (
            <div key={fret} className="flex flex-col items-center gap-1 font-mono text-[9px] font-semibold text-[#9a9c95]">
              <span>{fret}</span>
              <span className="flex h-1.5 gap-1">
                {SINGLE_INLAYS.has(fret) && <span className="h-1.5 w-1.5 rounded-full bg-[#c9c7bf] dark:bg-zinc-600" />}
                {fret === 12 && <><span className="h-1.5 w-1.5 rounded-full bg-[#c9c7bf] dark:bg-zinc-600" /><span className="h-1.5 w-1.5 rounded-full bg-[#c9c7bf] dark:bg-zinc-600" /></>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SoloFretboard;
