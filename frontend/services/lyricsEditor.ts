import { TabSection } from '../types';

export type EditMode = 'lyrics' | 'tab';

const COLS = 16;
const BEAT_COLUMNS = [0, 4, 8, 12];
const STORAGE_PREFIX = 'guitarflow-edit-mode:';

export const hasTabNotes = (sections: TabSection[]): boolean =>
  sections.some(section => section.measures.some(measure => measure.some(line => line.some(cell => cell && cell !== '-'))));

/** Songs without any tab notes are lead sheets, so they open in the lyrics-and-chords editor. */
export const defaultEditMode = (sections: TabSection[]): EditMode => (hasTabNotes(sections) ? 'tab' : 'lyrics');

export const loadEditMode = (songId: string | null | undefined, sections: TabSection[]): EditMode => {
  try {
    const stored = songId ? localStorage.getItem(`${STORAGE_PREFIX}${songId}`) : null;
    if (stored === 'lyrics' || stored === 'tab') return stored;
  } catch {
    // Fall through to the content-based default.
  }
  return defaultEditMode(sections);
};

export const saveEditMode = (songId: string | null | undefined, mode: EditMode): void => {
  if (!songId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${songId}`, mode);
  } catch {
    // The toggle still works for this visit.
  }
};

export interface Slot {
  col: number;
  span: number;
}

const toSlots = (columns: number[]): Slot[] => {
  const sorted = [...new Set(columns)].filter(col => col >= 0 && col < COLS).sort((a, b) => a - b);
  return sorted.map((col, index) => ({ col, span: (sorted[index + 1] ?? COLS) - col }));
};

/** Chord boxes: one per beat, plus any chord already stored between beats so nothing is hidden. */
export const chordSlots = (chords: Array<string | null>): Slot[] =>
  toSlots([...BEAT_COLUMNS, ...chords.flatMap((name, col) => (name ? [col] : []))]);

/** Lyric boxes start at the bar and at every chord or stored lyric, and stretch to the next one. */
export const lyricSlots = (chords: Array<string | null>, lyrics: Array<string | null>): Slot[] =>
  toSlots([
    0,
    ...chords.flatMap((name, col) => (name ? [col] : [])),
    ...lyrics.flatMap((text, col) => (text ? [col] : [])),
  ]);
