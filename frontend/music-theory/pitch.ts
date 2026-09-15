export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type AccidentalPreference = 'sharp' | 'flat';

const NATURAL_PITCHES: Record<string, PitchClass> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export const toPitchClass = (value: number): PitchClass =>
  (((value % 12) + 12) % 12) as PitchClass;

export const transposePitch = (pitch: PitchClass, semitones: number): PitchClass =>
  toPitchClass(pitch + semitones);

export const parsePitch = (name: string): PitchClass | null => {
  const match = name.trim().match(/^([A-Ga-g])([#b]?)$/);
  if (!match) return null;

  const natural = NATURAL_PITCHES[match[1].toUpperCase()];
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  return toPitchClass(natural + accidental);
};

export const formatPitch = (
  pitch: PitchClass,
  preference: AccidentalPreference = 'sharp'
): string => (preference === 'flat' ? FLAT_NAMES : SHARP_NAMES)[pitch];

export const accidentalPreferenceFor = (
  ...names: Array<string | undefined>
): AccidentalPreference => names.some(name => name?.includes('b')) ? 'flat' : 'sharp';
