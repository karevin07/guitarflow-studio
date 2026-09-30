import { Chord, formatPitch, keyAccidentalPreference, parseChord, toPitchClass, transposeChordSymbol } from '../music-theory';
import { VocalRange } from '../types';

/**
 * Suggest a key to sing in and a capo to play it with.
 * Keys: move the song's sung range so it sits in the middle of the singer's range.
 * Capo: for that key, try capo 0–7 and prefer chord shapes without barres.
 */

export const LOWEST_NOTE = 36; // C2
export const HIGHEST_NOTE = 84; // C6
export const MAX_CAPO = 7;

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** 60 → "C4". */
export const noteName = (midi: number): string => `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

export const VOICE_PRESETS: Array<{ id: string; label: string; range: VocalRange }> = [
  { id: 'male', label: '男生', range: { low: 48, high: 67 } }, // C3–G4
  { id: 'female', label: '女生', range: { low: 55, high: 74 } }, // G3–D5
];

/** Typical sung range of a pop melody, when the song's own range is not known. */
export const SONG_PRESETS: Array<{ id: string; label: string; range: VocalRange }> = [
  { id: 'male', label: '原唱男生', range: { low: 50, high: 66 } }, // D3–F#4
  { id: 'female', label: '原唱女生', range: { low: 57, high: 73 } }, // A3–C#5
];

const RANGE_KEY = 'guitarflow-vocal-range';

export const loadVocalRange = (): VocalRange | null => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RANGE_KEY) ?? 'null');
    return isValidRange(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveVocalRange = (range: VocalRange): void => {
  try {
    localStorage.setItem(RANGE_KEY, JSON.stringify(range));
  } catch {
    // Storage can be unavailable; the range still works for this visit.
  }
};

export const isValidRange = (range: unknown): range is VocalRange => {
  const value = range as VocalRange | null;
  return Boolean(value) && Number.isInteger(value!.low) && Number.isInteger(value!.high)
    && value!.low >= LOWEST_NOTE && value!.high <= HIGHEST_NOTE && value!.low < value!.high;
};

export interface KeyFit {
  /** Semitones to move the song from how it is sung on the original recording. */
  shift: number;
  /** How far the moved song goes past the singer's range (0 when it fits). */
  tooHigh: number;
  tooLow: number;
  /** Distance between the middles of the two ranges after moving, in semitones. */
  offCentre: number;
}

/** Shifts within ±maxShift, best first: fits, then centred, then the smaller move. */
export const rankKeyShifts = (song: VocalRange, singer: VocalRange, maxShift = 7): KeyFit[] => {
  const fits: KeyFit[] = [];
  for (let shift = -maxShift; shift <= maxShift; shift += 1) {
    fits.push({
      shift,
      tooHigh: Math.max(0, song.high + shift - singer.high),
      tooLow: Math.max(0, singer.low - (song.low + shift)),
      offCentre: Math.abs((song.low + song.high) / 2 + shift - (singer.low + singer.high) / 2),
    });
  }
  const strain = (fit: KeyFit) => fit.tooHigh + fit.tooLow;
  return fits.sort((a, b) => strain(a) - strain(b) || a.offCentre - b.offCentre || Math.abs(a.shift) - Math.abs(b.shift));
};

/** 0 = easy open shape, 1 = no barre but awkward, 2 = barre. */
export type ChordDifficulty = (symbol: string) => number;

export interface GuitarOption {
  capo: number;
  /** Transpose to apply to the stored chords (−6…+5). */
  transpose: number;
  /** Chords as fingered with this capo, most used first. */
  shapes: string[];
  /** Shapes that need a barre or are awkward. */
  hardShapes: string[];
  score: number;
}

const normalize = (semitones: number) => {
  const value = ((semitones % 12) + 12) % 12;
  return value >= 6 ? value - 12 : value;
};

/**
 * Ways to play the song `soundingShift` semitones away from how the stored chords sound
 * at `currentCapo` with no transpose, best first.
 */
export const guitarOptions = (
  chordSymbols: string[],
  currentCapo: number,
  soundingShift: number,
  difficulty: ChordDifficulty,
  spellingFor: (transpose: number) => 'sharp' | 'flat' | undefined = () => undefined,
): GuitarOption[] => {
  const counts = new Map<string, number>();
  chordSymbols.forEach(symbol => counts.set(symbol, (counts.get(symbol) ?? 0) + 1));
  const total = Math.max(1, chordSymbols.length);
  const options: GuitarOption[] = [];
  for (let capo = 0; capo <= MAX_CAPO; capo += 1) {
    const transpose = normalize(soundingShift + currentCapo - capo);
    const spelling = spellingFor(transpose);
    const shapeCounts = new Map<string, number>();
    counts.forEach((count, symbol) => {
      const shape = transposeChordSymbol(symbol, transpose, spelling) ?? symbol;
      shapeCounts.set(shape, (shapeCounts.get(shape) ?? 0) + count);
    });
    const shapes = [...shapeCounts.entries()].sort((a, b) => b[1] - a[1]).map(([shape]) => shape);
    const hardShapes = shapes.filter(shape => difficulty(shape) > 0);
    // Weigh how often hard chords come up, plus a little for every fret of capo.
    const weighted = shapes.reduce((sum, shape) => sum + difficulty(shape) * (shapeCounts.get(shape) ?? 0), 0) / total;
    const score = weighted * 4 + hardShapes.length + (capo > 0 ? 0.2 + capo * 0.1 : 0);
    options.push({ capo, transpose, shapes, hardShapes, score });
  }
  return options.sort((a, b) => a.score - b.score || a.capo - b.capo);
};

/** "C" / "Am" → pitch class, for reading the original key. */
export const keyTonic = (key: string | undefined | null): { tonic: number; minor: boolean } | null => {
  const chord: Chord | null = key ? parseChord(key.trim()) : null;
  return chord ? { tonic: chord.root, minor: chord.quality === 'minor' } : null;
};

export const keyLabel = (tonic: number, minor: boolean): string => {
  const key = { tonic: toPitchClass(tonic), mode: minor ? 'minor' as const : 'major' as const };
  return `${formatPitch(key.tonic, keyAccidentalPreference(key))}${minor ? 'm' : ''}`;
};

export { normalize as normalizeSemitones };
