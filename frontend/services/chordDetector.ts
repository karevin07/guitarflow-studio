import { ChordDefinition, TabSection } from '../types';
import { cellToFret } from './tabNotation';
import { CHORD_FORMULAS, ChordQuality, formatChord, formatPitch, toPitchClass, transposePitch } from '../music-theory';
import { STANDARD_TUNING, noteAt } from '../guitar';

export interface ChordDetectionCandidate {
  name: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  exactShape: boolean;
  score: number;
}

export interface ChordDetectionResult {
  frets: (number | null)[];
  notes: string[];
  candidates: ChordDetectionCandidate[];
}

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

export const detectChordCandidates = (
  frets: (number | null)[],
  library: ChordDefinition[]
): ChordDetectionResult => {
  const empty = { frets, notes: [], candidates: [] };
  if (frets.length !== STANDARD_TUNING.strings.length || !frets.some(f => f !== null)) return empty;

  const pitches = frets.flatMap((fret, stringIndex) =>
    fret === null ? [] : [noteAt(STANDARD_TUNING.strings[stringIndex], fret)]
  );
  const pitchSet = new Set(pitches);
  const notes = [...pitchSet].sort((a, b) => a - b).map(pitch => formatPitch(pitch, 'sharp'));

  const qualities = Object.keys(CHORD_FORMULAS) as ChordQuality[];
  let bassString = -1;
  for (let index = frets.length - 1; index >= 0; index -= 1) {
    if (frets[index] !== null) {
      bassString = index;
      break;
    }
  }
  const bass = bassString >= 0 ? noteAt(STANDARD_TUNING.strings[bassString], frets[bassString]!) : null;
  const matches = new Map<string, ChordDetectionCandidate>();

  for (const chord of library) {
    if (!fretsMatch(chord.frets, frets)) continue;
    matches.set(chord.name, {
      name: chord.name,
      confidence: 'high',
      reason: '與和弦庫指法完全相同',
      exactShape: true,
      score: 1000,
    });
  }

  if (pitchSet.size < 2) return { frets, notes, candidates: [...matches.values()].slice(0, 5) };

  for (let root = 0; root < 12; root += 1) {
    const rootPitch = toPitchClass(root);
    for (const quality of qualities) {
      const formula = CHORD_FORMULAS[quality];
      const chordPitches = new Set(formula.intervals.map(interval => transposePitch(rootPitch, interval)));
      const essentials = formula.essentialIntervals.map(interval => transposePitch(rootPitch, interval));
      if (![...pitchSet].every(pitch => chordPitches.has(pitch)) || !essentials.every(pitch => pitchSet.has(pitch))) {
        continue;
      }
      const name = formatChord({ root: rootPitch, quality, accidentalPreference: 'sharp' });
      if (matches.has(name)) continue;
      const complete = [...chordPitches].every(pitch => pitchSet.has(pitch));
      const rootInBass = bass === root;
      matches.set(name, {
        name,
        confidence: complete && rootInBass && pitchSet.size >= 3 ? 'high' : complete ? 'medium' : 'low',
        reason: !complete ? '部分組成音省略，需確認和弦語境' : rootInBass ? '組成音完整，最低音為根音' : '組成音完整，但最低音不是根音',
        exactShape: false,
        score: (rootInBass ? 20 : 0) + formula.intervals.length * 2 - (chordPitches.size - pitchSet.size),
      });
    }
  }

  return {
    frets,
    notes,
    candidates: [...matches.values()].sort((a, b) => b.score - a.score || a.name.length - b.name.length).slice(0, 5),
  };
};

export const detectChordName = (frets: (number | null)[], library: ChordDefinition[]): string | null =>
  detectChordCandidates(frets, library).candidates[0]?.name ?? null;

export const detectChordCandidatesFromColumn = (
  columnNotes: string[],
  library: ChordDefinition[]
): ChordDetectionResult => detectChordCandidates(columnNotesToFrets(columnNotes), library);

/** Confirm a detected label without replacing the frets the musician entered. */
export const labelChordColumn = (
  sections: TabSection[],
  sectionId: string,
  measureIdx: number,
  colIdx: number,
  name: string
): TabSection[] => sections.map(section => {
  if (section.id !== sectionId || section.chords[measureIdx]?.[colIdx] === undefined) return section;
  if (section.chords[measureIdx][colIdx] === name) return section;
  const chords = [...section.chords];
  chords[measureIdx] = [...chords[measureIdx]];
  chords[measureIdx][colIdx] = name;
  return { ...section, chords };
});

export const detectChordFromColumn = (
  columnNotes: string[],
  library: ChordDefinition[]
): ChordDefinition | null => {
  const frets = columnNotesToFrets(columnNotes);
  const name = detectChordName(frets, library);
  if (name) {
    return { name, frets };
  }
  const hasNotes = frets.some(f => f !== null);
  if (!hasNotes) return null;
  return { name: 'Custom', frets };
};
