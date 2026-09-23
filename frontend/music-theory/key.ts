import { CHORD_FORMULAS, Chord, ChordQuality, getChordPitchClasses } from './chord';
import { AccidentalPreference, PitchClass, formatPitch, toPitchClass, transposePitch } from './pitch';
import { ScaleType, getScalePitchClasses } from './scale';

export type KeyMode = 'major' | 'minor';

export interface MusicalKey {
  tonic: PitchClass;
  mode: KeyMode;
}

export interface KeyCandidate extends MusicalKey {
  score: number;
  confidence: 'high' | 'medium' | 'low';
}

const FLAT_MAJOR_TONICS = new Set<PitchClass>([5, 10, 3, 8, 1, 6]);
const FLAT_MINOR_TONICS = new Set<PitchClass>([2, 7, 0, 5, 10, 3]);

export const keyAccidentalPreference = (key: MusicalKey): AccidentalPreference =>
  (key.mode === 'major' ? FLAT_MAJOR_TONICS : FLAT_MINOR_TONICS).has(key.tonic) ? 'flat' : 'sharp';

export const formatKey = (key: MusicalKey, preference = keyAccidentalPreference(key)): string =>
  `${formatPitch(key.tonic, preference)}${key.mode === 'minor' ? 'm' : ''}`;

export const keyScaleType = (key: MusicalKey): ScaleType => key.mode === 'major' ? 'major' : 'naturalMinor';

export const getKeyPitchClasses = (key: MusicalKey): PitchClass[] =>
  getScalePitchClasses(key.tonic, keyScaleType(key));

/** Minor keys also accept the raised leading tone used by the major V chord. */
const allowedPitchClasses = (key: MusicalKey): Set<PitchClass> => {
  const pitches = new Set(getKeyPitchClasses(key));
  if (key.mode === 'minor') pitches.add(transposePitch(key.tonic, 11));
  return pitches;
};

export const isChordDiatonic = (chord: Chord, key: MusicalKey): boolean => {
  const allowed = allowedPitchClasses(key);
  return getChordPitchClasses(chord).every(pitch => allowed.has(pitch));
};

const isTonicChord = (chord: Chord, key: MusicalKey): boolean => {
  if (chord.root !== key.tonic) return false;
  const third = CHORD_FORMULAS[chord.quality].intervals.includes(3) ? 'minor' : 'major';
  return third === key.mode;
};

const isDominantOf = (chord: Chord, key: MusicalKey): boolean =>
  chord.root === transposePitch(key.tonic, 7) && CHORD_FORMULAS[chord.quality].intervals.includes(4);

const scoreKey = (chords: Chord[], key: MusicalKey): number => {
  const allowed = allowedPitchClasses(key);
  const leadingTone = transposePitch(key.tonic, 11);
  let fit = 0;
  chords.forEach(chord => {
    const pitches = getChordPitchClasses(chord);
    const inKey = pitches.reduce((sum, pitch) => {
      if (!allowed.has(pitch)) return sum;
      // The borrowed leading tone counts, but less than a true scale tone.
      return sum + (key.mode === 'minor' && pitch === leadingTone ? 0.75 : 1);
    }, 0);
    fit += inKey / pitches.length;
  });
  let score = fit / chords.length;

  if (isTonicChord(chords[0], key)) score += 0.08;
  if (isTonicChord(chords[chords.length - 1], key)) score += 0.08;
  const tonicShare = chords.filter(chord => isTonicChord(chord, key)).length / chords.length;
  score += tonicShare * 0.05;

  let cadences = 0;
  for (let index = 1; index < chords.length; index += 1) {
    if (isDominantOf(chords[index - 1], key) && isTonicChord(chords[index], key)) cadences += 1;
  }
  score += Math.min(0.1, cadences * 0.02);
  return score;
};

/** Rank all 24 major/minor keys for a chord progression, best first. */
export const detectKey = (chords: Chord[]): KeyCandidate[] => {
  if (chords.length === 0) return [];
  const candidates: Array<MusicalKey & { score: number }> = [];
  for (let tonic = 0; tonic < 12; tonic += 1) {
    (['major', 'minor'] as const).forEach(mode => {
      const key = { tonic: toPitchClass(tonic), mode };
      candidates.push({ ...key, score: scoreKey(chords, key) });
    });
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0].score;
  const runnerUp = candidates[1]?.score ?? 0;
  return candidates.map((candidate, index) => ({
    ...candidate,
    confidence: index === 0
      ? best >= 1 && best - runnerUp >= 0.05 ? 'high' : best >= 0.9 ? 'medium' : 'low'
      : 'low',
  }));
};

const DEGREE_NUMERALS = ['I', '♭II', 'II', '♭III', 'III', 'IV', '♯IV', 'V', '♭VI', 'VI', '♭VII', 'VII'];

const MINOR_QUALITIES = new Set<ChordQuality>(['minor', 'min7', 'min6', 'min9', 'diminished', 'min7b5', 'dim7']);

const NUMERAL_SUFFIX: Partial<Record<ChordQuality, string>> = {
  diminished: '°',
  augmented: '+',
  maj7: 'maj7',
  '7': '7',
  min7: '7',
  min7b5: 'ø7',
  dim7: '°7',
  sus2: 'sus2',
  sus4: 'sus4',
  '6': '6',
  min6: '6',
  '9': '9',
  maj9: 'maj9',
  min9: '9',
  add9: 'add9',
};

const numeralFor = (root: PitchClass, quality: ChordQuality, tonic: PitchClass): string => {
  const numeral = DEGREE_NUMERALS[toPitchClass(root - tonic)];
  const cased = MINOR_QUALITIES.has(quality) ? numeral.toLowerCase() : numeral;
  return `${cased}${NUMERAL_SUFFIX[quality] ?? ''}`;
};

/** Triad built on a key's scale degree, or null when the pitch is not a scale degree. */
const diatonicTriadNumeral = (degreeRoot: PitchClass, key: MusicalKey): string | null => {
  const scale = getKeyPitchClasses(key);
  const index = scale.indexOf(degreeRoot);
  if (index < 0) return null;
  const third = toPitchClass(scale[(index + 2) % 7] - degreeRoot);
  const fifth = toPitchClass(scale[(index + 4) % 7] - degreeRoot);
  if (fifth !== 7) return null; // diminished triads are not tonicized
  return numeralFor(degreeRoot, third === 3 ? 'minor' : 'major', key.tonic);
};

export interface ChordFunction {
  numeral: string;
  diatonic: boolean;
  /** Set for non-diatonic dominant chords, e.g. "V7/IV". */
  secondaryDominant?: string;
  /** Resolution target of a secondary dominant. */
  target?: PitchClass;
}

export const analyzeChordFunction = (chord: Chord, key: MusicalKey): ChordFunction => {
  const diatonic = isChordDiatonic(chord, key);
  const numeral = numeralFor(chord.root, chord.quality, key.tonic);
  if (diatonic) return { numeral, diatonic };

  const dominantQuality = chord.quality === '7' || chord.quality === '9' || chord.quality === 'major';
  if (dominantQuality) {
    const target = transposePitch(chord.root, 5);
    const targetNumeral = target === key.tonic ? null : diatonicTriadNumeral(target, key);
    if (targetNumeral) {
      const dominant = chord.quality === 'major' ? 'V' : 'V7';
      return { numeral, diatonic, secondaryDominant: `${dominant}/${targetNumeral}`, target };
    }
  }
  return { numeral, diatonic };
};
