import { ChordDefinition } from '../types';
import { cellToFret } from './tabNotation';

const fretsMatch = (a: (number | null)[], b: (number | null)[]): boolean => {
  if (a.length !== 6 || b.length !== 6) return false;
  for (let i = 0; i < 6; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

/** Compare a played column (6 strings) against a chord shape. */
export const columnNotesToFrets = (columnNotes: string[]): (number | null)[] =>
  columnNotes.map(n => {
    if (n === '-' || n === '·') return null;
    if (n.toLowerCase() === 'x') return null;
    return cellToFret(n);
  });

export const detectChordName = (
  frets: (number | null)[],
  library: ChordDefinition[]
): string | null => {
  const hasAnyNote = frets.some(f => f !== null);
  if (!hasAnyNote) return null;

  for (const chord of library) {
    if (fretsMatch(chord.frets, frets)) return chord.name;
  }
  return null;
};

export const detectChordFromColumn = (
  columnNotes: string[],
  library: ChordDefinition[]
): ChordDefinition | null => {
  const frets = columnNotesToFrets(columnNotes);
  const name = detectChordName(frets, library);
  if (name) {
    const found = library.find(c => c.name === name);
    if (found) return found;
  }
  const hasNotes = frets.some(f => f !== null);
  if (!hasNotes) return null;
  return { name: 'Custom', frets };
};
