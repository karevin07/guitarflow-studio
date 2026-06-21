import React from 'react';

/** Extract the primary fret number from a tab cell (ignores techniques). */
export const cellToFret = (note: string): number | null => {
  if (!note || note === '-' || note === '·') return null;
  if (note.toLowerCase() === 'x') return null;
  const match = note.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

/** Parse a tab cell into one or more fret numbers for playback. */
export const parseTabCellPitches = (note: string): number[] => {
  if (!note || note === '-' || note === '·' || note.toLowerCase() === 'x') return [];

  const hammer = note.match(/^(\d+)h(\d+)$/i);
  if (hammer) return [parseInt(hammer[1], 10), parseInt(hammer[2], 10)];

  const pull = note.match(/^(\d+)p(\d+)$/i);
  if (pull) return [parseInt(pull[1], 10), parseInt(pull[2], 10)];

  const bend = note.match(/^(\d+)b(\d+)$/i);
  if (bend) return [parseInt(bend[1], 10), parseInt(bend[2], 10)];

  const simple = note.match(/^(\d+)/);
  if (simple) return [parseInt(simple[1], 10)];

  return [];
};

export const isMutedCell = (note: string): boolean => note.toLowerCase() === 'x';

export type TechniqueKind = 'hammer' | 'pull' | 'bend';

export interface TechniqueInputHint {
  kind: TechniqueKind;
  message: string;
}

/** Hint when the user is mid-way through entering h / p / b notation. */
export const getTechniqueInputHint = (note: string): TechniqueInputHint | null => {
  const hammer = note.match(/^(\d+)h$/i);
  if (hammer) {
    return { kind: 'hammer', message: `輸入目標品絲完成 Hammer-on（例：${hammer[1]}h7）` };
  }
  const pull = note.match(/^(\d+)p$/i);
  if (pull) {
    return { kind: 'pull', message: `輸入目標品絲完成 Pull-off（例：${pull[1]}p5）` };
  }
  const bend = note.match(/^(\d+)b$/i);
  if (bend) {
    return { kind: 'bend', message: `輸入 Bend 目標音（例：${bend[1]}b9）` };
  }
  return null;
};

/** Strip a pending technique suffix (e.g. 7b → 7). */
export const revertPendingTechnique = (note: string): string | null => {
  const match = note.match(/^(\d+)[hpb]$/i);
  return match ? match[1] : null;
};

/** Render a tab cell note with technique styling. */
export const renderTabNote = (note: string): React.ReactNode => {
  if (note === '-' || note === '·') {
    return React.createElement('span', { className: 'text-slate-300 dark:text-zinc-700 font-semibold' }, '•');
  }

  if (note.toLowerCase() === 'x') {
    return React.createElement(
      'span',
      { className: 'text-slate-500 dark:text-zinc-400 font-bold uppercase text-[10px]' },
      'x'
    );
  }

  const hammer = note.match(/^(\d+)h(\d+)$/i);
  if (hammer) {
    return React.createElement(
      'span',
      { className: 'text-indigo-600 dark:text-violet-400 font-bold' },
      hammer[1],
      React.createElement('span', { className: 'text-amber-600 dark:text-amber-400 italic text-[9px] ml-[0.5px]' }, 'h'),
      hammer[2]
    );
  }

  const pull = note.match(/^(\d+)p(\d+)$/i);
  if (pull) {
    return React.createElement(
      'span',
      { className: 'text-indigo-600 dark:text-violet-400 font-bold' },
      pull[1],
      React.createElement('span', { className: 'text-sky-600 dark:text-sky-400 italic text-[9px] ml-[0.5px]' }, 'p'),
      pull[2]
    );
  }

  const bend = note.match(/^(\d+)b(\d+)$/i);
  if (bend) {
    return React.createElement(
      'span',
      { className: 'text-indigo-600 dark:text-violet-400 font-bold' },
      bend[1],
      React.createElement('span', { className: 'text-orange-500 dark:text-orange-400 italic text-[9px] ml-[0.5px]' }, 'b'),
      bend[2]
    );
  }

  const slide = note.split(/([s/])/);
  if (slide.length > 1) {
    return React.createElement(
      'span',
      { className: 'text-indigo-600 dark:text-violet-400 font-bold' },
      slide[0],
      React.createElement('span', { className: 'text-pink-500 dark:text-fuchsia-400 italic text-[10px] ml-[1px]' }, slide[1])
    );
  }

  return React.createElement('span', { className: 'text-slate-800 dark:text-zinc-200 font-bold' }, note);
};
