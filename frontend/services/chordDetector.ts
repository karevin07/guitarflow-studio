import { ChordDefinition } from '../types';
import { cellToFret } from './tabNotation';
import { CHORD_FORMULAS, ChordQuality, formatChord, toPitchClass, transposePitch } from '../music-theory';
import { STANDARD_TUNING, noteAt } from '../guitar';

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

  const pitches = frets.flatMap((fret, stringIndex) =>
    fret === null ? [] : [noteAt(STANDARD_TUNING.strings[stringIndex], fret)]
  );
  const pitchSet = new Set(pitches);
  if (pitchSet.size < 2) return null;

  const qualities = Object.keys(CHORD_FORMULAS) as ChordQuality[];
  let bassString = -1;
  for (let index = frets.length - 1; index >= 0; index -= 1) {
    if (frets[index] !== null) {
      bassString = index;
      break;
    }
  }
  const bass = bassString >= 0 ? noteAt(STANDARD_TUNING.strings[bassString], frets[bassString]!) : null;
  const matches: Array<{ name: string; score: number }> = [];

  for (let root = 0; root < 12; root += 1) {
    const rootPitch = toPitchClass(root);
    for (const quality of qualities) {
      const formula = CHORD_FORMULAS[quality];
      const chordPitches = new Set(formula.intervals.map(interval => transposePitch(rootPitch, interval)));
      const essentials = formula.essentialIntervals.map(interval => transposePitch(rootPitch, interval));
      if (![...pitchSet].every(pitch => chordPitches.has(pitch)) || !essentials.every(pitch => pitchSet.has(pitch))) {
        continue;
      }
      matches.push({
        name: formatChord({ root: rootPitch, quality, accidentalPreference: 'sharp' }),
        score: (bass === root ? 20 : 0) + formula.intervals.length * 2 - (chordPitches.size - pitchSet.size),
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score || a.name.length - b.name.length)[0]?.name ?? null;
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
    return { name, frets };
  }
  const hasNotes = frets.some(f => f !== null);
  if (!hasNotes) return null;
  return { name: 'Custom', frets };
};
