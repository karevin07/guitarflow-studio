import React from 'react';
import { PitchClass } from '../music-theory';
import { STANDARD_TUNING, noteAt } from '../guitar';
import { FretMark, FretMarkRole } from '../services/soloGuide';

interface SoloFretboardProps {
  /** Mark for each pitch class (0-11); null hides the pitch. */
  marks: Array<FretMark | null>;
  /** Pitches to ring as landing targets. */
  targets?: ReadonlySet<PitchClass>;
  /** Only draw this fret range (relative to the capo); null draws the whole neck. */
  range?: { from: number; to: number } | null;
  /** When set, only these "string:fret" positions are shown (e.g. a pentatonic box). */
  only?: ReadonlySet<string> | null;
  /** "string:fret" positions sounding right now during a preview. */
  activePositions?: ReadonlySet<string> | null;
  maxFret?: number;
  onPlayNote?: (stringIndex: number, fret: number) => void;
}

const STRING_NAMES = ['e', 'B', 'G', 'D', 'A', 'E'];
const STRING_WEIGHTS = [1, 1.25, 1.5, 2, 2.5, 3];
const SINGLE_INLAYS = new Set([3, 5, 7, 9, 15]);

const CHORD_TONE = 'bg-[#2b6c59] text-white border-[#2b6c59] dark:bg-emerald-500 dark:border-emerald-500 dark:text-zinc-950';

const ROLE_STYLES: Record<FretMarkRole, string> = {
  root: 'bg-[#4d5bd2] text-white border-[#4d5bd2] dark:bg-violet-500 dark:border-violet-500',
  third: CHORD_TONE,
  fifth: CHORD_TONE,
  seventh: CHORD_TONE,
  tension: 'bg-[#fbf1dc] text-[#8a5a12] border-[#ecd29c] dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
  passing: 'bg-[#fffefa] text-[#9a9c95] border-dashed border-[#c9c7bf] dark:bg-zinc-900 dark:text-zinc-500 dark:border-zinc-700',
  scale: 'bg-[#efede7] text-[#3d403a] border-[#d6d4cc] dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
};

export const CHORD_LEGEND: Array<{ role: FretMarkRole; label: string; hint: string }> = [
  { role: 'root', label: '根音', hint: '和弦的名字那個音' },
  { role: 'third', label: '和弦音', hint: '最安全，可以停留' },
  { role: 'tension', label: '可以用', hint: '好聽的色彩音' },
  { role: 'passing', label: '小心用', hint: '放在弱拍、快速帶過' },
];

export const SCALE_LEGEND: Array<{ role: FretMarkRole; label: string; hint: string }> = [
  { role: 'root', label: '主音', hint: '音階的起點' },
  { role: 'scale', label: '音階音', hint: '整首歌都能用' },
];

export const FretMarkSwatch: React.FC<{ role: FretMarkRole }> = ({ role }) => (
  <span className={`inline-block h-3.5 w-3.5 shrink-0 rounded-full border ${ROLE_STYLES[role]}`} />
);

const SoloFretboard: React.FC<SoloFretboardProps> = ({
  marks,
  targets,
  range = null,
  only = null,
  activePositions = null,
  maxFret = 15,
  onPlayNote,
}) => {
  const from = range ? Math.max(0, range.from) : 0;
  const to = range ? Math.min(maxFret, range.to) : maxFret;
  const frets = Array.from({ length: to - from + 1 }, (_, index) => from + index);
  const hasNut = from === 0;
  const columns = `1.5rem ${hasNut ? '2.25rem ' : ''}repeat(${frets.length - (hasNut ? 1 : 0)}, minmax(2.6rem, 1fr))`;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#dedcd4] bg-[#fffefa] dark:border-zinc-800 dark:bg-zinc-900" data-testid="solo-fretboard">
      <div className="px-3 pb-3 pt-4" style={{ minWidth: `${frets.length * 2.6 + 3}rem` }}>
        {STANDARD_TUNING.strings.map((openString, stringIndex) => (
          <div key={stringIndex} className="grid h-10 items-center" style={{ gridTemplateColumns: columns }}>
            <span className="font-mono text-[10px] font-semibold text-[#9a9c95]">{STRING_NAMES[stringIndex]}</span>
            {frets.map(fret => {
              const pitch = noteAt(openString, fret);
              const mark = marks[pitch];
              const visible = mark && (!only || only.has(`${stringIndex}:${fret}`));
              const isTarget = visible && targets?.has(pitch);
              const isActive = activePositions?.has(`${stringIndex}:${fret}`) ?? false;
              return (
                <div
                  key={fret}
                  className={`relative flex h-full items-center justify-center ${fret === 0 ? 'border-r-4 border-[#c9c7bf] dark:border-zinc-600' : 'border-r border-[#dedcd4] dark:border-zinc-700'} ${fret === from && fret > 0 ? 'border-l border-l-[#dedcd4] dark:border-l-zinc-700' : ''}`}
                >
                  {fret > 0 && (
                    <span
                      className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-[#b9b7af] dark:bg-zinc-600"
                      style={{ height: `${STRING_WEIGHTS[stringIndex]}px` }}
                    />
                  )}
                  {isActive && (
                    <span
                      className="absolute z-20 grid h-8 min-w-8 place-items-center rounded-full bg-[#e0a526] px-1 font-mono text-[10px] font-bold text-[#171a18] shadow-[0_0_0_4px_rgba(224,165,38,0.3)]"
                      data-testid="solo-fretboard-active"
                    >
                      {fret}
                    </span>
                  )}
                  {visible && (
                    <button
                      type="button"
                      onClick={() => onPlayNote?.(stringIndex, fret)}
                      className={`relative z-10 grid h-7 min-w-7 place-items-center rounded-full border px-1 font-mono text-[10px] font-bold transition-transform hover:scale-110 ${ROLE_STYLES[mark.role]} ${isTarget ? 'ring-2 ring-offset-2 ring-[#e0a526] ring-offset-[#fffefa] dark:ring-offset-zinc-900' : ''}`}
                      aria-label={`${stringIndex + 1} 弦（${STRING_NAMES[stringIndex]}）第 ${fret} 格 ${mark.label}`}
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
          <span />
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
