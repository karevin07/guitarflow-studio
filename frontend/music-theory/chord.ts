import {
  AccidentalPreference,
  PitchClass,
  accidentalPreferenceFor,
  formatPitch,
  parsePitch,
  transposePitch,
} from './pitch';

export type ChordQuality =
  | 'major'
  | 'minor'
  | 'diminished'
  | 'augmented'
  | 'maj7'
  | '7'
  | 'min7'
  | 'min7b5'
  | 'dim7'
  | 'sus2'
  | 'sus4'
  | '6'
  | 'min6'
  | '9'
  | 'maj9'
  | 'min9'
  | 'add9';

export interface ChordFormula {
  quality: ChordQuality;
  intervals: readonly number[];
  essentialIntervals: readonly number[];
}

export interface Chord {
  root: PitchClass;
  quality: ChordQuality;
  bass?: PitchClass;
  accidentalPreference: AccidentalPreference;
}

export const CHORD_FORMULAS: Record<ChordQuality, ChordFormula> = {
  major: { quality: 'major', intervals: [0, 4, 7], essentialIntervals: [0, 4] },
  minor: { quality: 'minor', intervals: [0, 3, 7], essentialIntervals: [0, 3] },
  diminished: { quality: 'diminished', intervals: [0, 3, 6], essentialIntervals: [0, 3, 6] },
  augmented: { quality: 'augmented', intervals: [0, 4, 8], essentialIntervals: [0, 4, 8] },
  maj7: { quality: 'maj7', intervals: [0, 4, 7, 11], essentialIntervals: [0, 4, 11] },
  '7': { quality: '7', intervals: [0, 4, 7, 10], essentialIntervals: [0, 4, 10] },
  min7: { quality: 'min7', intervals: [0, 3, 7, 10], essentialIntervals: [0, 3, 10] },
  min7b5: { quality: 'min7b5', intervals: [0, 3, 6, 10], essentialIntervals: [0, 3, 6, 10] },
  dim7: { quality: 'dim7', intervals: [0, 3, 6, 9], essentialIntervals: [0, 3, 6, 9] },
  sus2: { quality: 'sus2', intervals: [0, 2, 7], essentialIntervals: [0, 2] },
  sus4: { quality: 'sus4', intervals: [0, 5, 7], essentialIntervals: [0, 5] },
  '6': { quality: '6', intervals: [0, 4, 7, 9], essentialIntervals: [0, 4, 9] },
  min6: { quality: 'min6', intervals: [0, 3, 7, 9], essentialIntervals: [0, 3, 9] },
  '9': { quality: '9', intervals: [0, 4, 7, 10, 14], essentialIntervals: [0, 4, 10, 2] },
  maj9: { quality: 'maj9', intervals: [0, 4, 7, 11, 14], essentialIntervals: [0, 4, 11, 2] },
  min9: { quality: 'min9', intervals: [0, 3, 7, 10, 14], essentialIntervals: [0, 3, 10, 2] },
  add9: { quality: 'add9', intervals: [0, 4, 7, 14], essentialIntervals: [0, 4, 2] },
};

const QUALITY_ALIASES: Record<string, ChordQuality> = {
  '': 'major',
  M: 'major',
  maj: 'major',
  m: 'minor',
  min: 'minor',
  '-': 'minor',
  dim: 'diminished',
  '°': 'diminished',
  aug: 'augmented',
  '+': 'augmented',
  maj7: 'maj7',
  M7: 'maj7',
  '7': '7',
  m7: 'min7',
  min7: 'min7',
  '-7': 'min7',
  m7b5: 'min7b5',
  'm7♭5': 'min7b5',
  'ø': 'min7b5',
  dim7: 'dim7',
  '°7': 'dim7',
  sus2: 'sus2',
  sus4: 'sus4',
  sus: 'sus4',
  '6': '6',
  m6: 'min6',
  min6: 'min6',
  '9': '9',
  maj9: 'maj9',
  M9: 'maj9',
  m9: 'min9',
  min9: 'min9',
  add9: 'add9',
};

const QUALITY_SUFFIX: Record<ChordQuality, string> = {
  major: '',
  minor: 'm',
  diminished: 'dim',
  augmented: 'aug',
  maj7: 'maj7',
  '7': '7',
  min7: 'm7',
  min7b5: 'm7b5',
  dim7: 'dim7',
  sus2: 'sus2',
  sus4: 'sus4',
  '6': '6',
  min6: 'm6',
  '9': '9',
  maj9: 'maj9',
  min9: 'm9',
  add9: 'add9',
};

export const parseChord = (symbol: string): Chord | null => {
  const match = symbol.trim().match(/^([A-Ga-g][#b]?)([^/]*)?(?:\/([A-Ga-g][#b]?))?$/);
  if (!match) return null;

  const rootName = match[1];
  const qualityName = match[2] ?? '';
  const bassName = match[3];
  const root = parsePitch(rootName);
  const bass = bassName ? parsePitch(bassName) : undefined;
  const quality = QUALITY_ALIASES[qualityName];

  if (root === null || quality === undefined || bass === null) return null;

  return {
    root,
    quality,
    ...(bass !== undefined ? { bass } : {}),
    accidentalPreference: accidentalPreferenceFor(rootName, bassName),
  };
};

export const getChordPitchClasses = (chord: Chord): PitchClass[] =>
  Array.from(new Set(CHORD_FORMULAS[chord.quality].intervals.map(interval =>
    transposePitch(chord.root, interval)
  )));

export const getEssentialPitchClasses = (chord: Chord): PitchClass[] =>
  CHORD_FORMULAS[chord.quality].essentialIntervals.map(interval =>
    transposePitch(chord.root, interval)
  );

export const formatChord = (
  chord: Chord,
  preference: AccidentalPreference = chord.accidentalPreference
): string => {
  const root = formatPitch(chord.root, preference);
  const suffix = QUALITY_SUFFIX[chord.quality];
  const bass = chord.bass === undefined ? '' : `/${formatPitch(chord.bass, preference)}`;
  return `${root}${suffix}${bass}`;
};

export const transposeChord = (chord: Chord, semitones: number): Chord => ({
  ...chord,
  root: transposePitch(chord.root, semitones),
  ...(chord.bass !== undefined ? { bass: transposePitch(chord.bass, semitones) } : {}),
});

export const transposeChordSymbol = (
  symbol: string | null,
  semitones: number,
  preference?: AccidentalPreference
): string | null => {
  if (!symbol || semitones === 0) return symbol;
  const chord = parseChord(symbol);
  return chord ? formatChord(transposeChord(chord, semitones), preference) : symbol;
};
