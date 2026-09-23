import { CHORD_FORMULAS, Chord, getChordPitchClasses } from './chord';
import {
  ChordFunction,
  MusicalKey,
  analyzeChordFunction,
  getKeyPitchClasses,
  keyAccidentalPreference,
  keyScaleType,
} from './key';
import { AccidentalPreference, PitchClass, toPitchClass, transposePitch } from './pitch';
import { ScaleType, getScalePitchClasses } from './scale';

/**
 * How a pitch class behaves over a chord in a single-note line.
 * - root/third/fifth/seventh: chord tones; third and seventh are guide tones.
 * - tension: in the scale and safe to sustain (9th, 6th, sus colors).
 * - passing: in the scale but a half step above a chord tone; use on weak beats.
 * - outside: not in the chord scale.
 */
export type NoteRole = 'root' | 'third' | 'fifth' | 'seventh' | 'tension' | 'passing' | 'outside';

export interface ChordScale {
  root: PitchClass;
  type: ScaleType;
  reason?: string;
}

export interface ChordSoloAnalysis {
  chord: Chord;
  function: ChordFunction;
  scale: ChordScale;
  /** Role of every pitch class, indexed 0-11. */
  roles: NoteRole[];
  /** Notes worth landing on when this chord arrives: third first, then seventh or root. */
  targets: PitchClass[];
  /** Bass note of a slash chord, useful for a walking bass line. */
  bass?: PitchClass;
}

const chordToneRole = (interval: number, chord: Chord): NoteRole | null => {
  const intervals = CHORD_FORMULAS[chord.quality].intervals.map(value => value % 12);
  if (!intervals.includes(interval)) return null;
  if (interval === 0) return 'root';
  if (interval === 3 || interval === 4) return 'third';
  if (interval === 6 || interval === 7 || interval === 8) return 'fifth';
  if (interval === 10 || interval === 11 || (interval === 9 && chord.quality === 'dim7')) return 'seventh';
  return 'tension';
};

export const classifyNotesForChord = (chord: Chord, scale: readonly PitchClass[]): NoteRole[] => {
  const chordTones = new Set(getChordPitchClasses(chord));
  const inScale = new Set(scale);
  return Array.from({ length: 12 }, (_, value) => {
    const pitch = toPitchClass(value);
    const role = chordToneRole(toPitchClass(pitch - chord.root), chord);
    if (role) return role;
    if (!inScale.has(pitch)) return 'outside';
    return chordTones.has(transposePitch(pitch, -1)) ? 'passing' : 'tension';
  });
};

/** Whether the diatonic triad on this scale degree has a minor third. */
const isMinorDegree = (scale: PitchClass[], degree: PitchClass): boolean =>
  scale.includes(transposePitch(degree, 3));

export const chooseChordScale = (chord: Chord, key: MusicalKey, fn = analyzeChordFunction(chord, key)): ChordScale => {
  const chordTones = getChordPitchClasses(chord);

  if (fn.diatonic) {
    const leadingTone = transposePitch(key.tonic, 11);
    if (key.mode === 'minor' && chordTones.includes(leadingTone)) {
      return { root: key.tonic, type: 'harmonicMinor', reason: '小調的 V 和弦：用和聲小調（升高導音）' };
    }
    return { root: key.tonic, type: keyScaleType(key) };
  }

  if (fn.secondaryDominant && fn.target !== undefined) {
    if (isMinorDegree(getKeyPitchClasses(key), fn.target)) {
      return {
        root: fn.target,
        type: 'harmonicMinor',
        reason: `次屬和弦 ${fn.secondaryDominant}：往小和弦解決，用目標的和聲小調`,
      };
    }
    return {
      root: chord.root,
      type: 'mixolydian',
      reason: `次屬和弦 ${fn.secondaryDominant}：用 Mixolydian，暫時離調再解決`,
    };
  }

  const parallelType: ScaleType = key.mode === 'major' ? 'naturalMinor' : 'major';
  const parallel = new Set(getScalePitchClasses(key.tonic, parallelType));
  if (chordTones.every(pitch => parallel.has(pitch))) {
    return {
      root: key.tonic,
      type: parallelType,
      reason: key.mode === 'major' ? '借用和弦：來自平行小調' : '借用和弦：來自平行大調',
    };
  }

  const quality = CHORD_FORMULAS[chord.quality].intervals;
  const type: ScaleType = quality.includes(3) ? 'dorian' : quality.includes(10) ? 'mixolydian' : 'major';
  return { root: chord.root, type, reason: '調外和弦：以和弦本身的音階處理' };
};

// Semitones from a scale's root up to the major key that shares its notes.
const PARENT_MAJOR_OFFSET: Record<ScaleType, number> = {
  major: 0,
  majorPentatonic: 0,
  naturalMinor: 3,
  minorPentatonic: 3,
  blues: 3,
  harmonicMinor: 3,
  mixolydian: 5,
  dorian: 10,
};

/** Spell notes like the scale's parent key, so C mixolydian shows Bb rather than A#. */
export const scaleAccidentalPreference = (scale: Pick<ChordScale, 'root' | 'type'>): AccidentalPreference =>
  keyAccidentalPreference({ tonic: transposePitch(scale.root, PARENT_MAJOR_OFFSET[scale.type]), mode: 'major' });

export const analyzeChordForSolo = (chord: Chord, key: MusicalKey): ChordSoloAnalysis => {
  const fn = analyzeChordFunction(chord, key);
  const scale = chooseChordScale(chord, key, fn);
  const roles = classifyNotesForChord(chord, getScalePitchClasses(scale.root, scale.type));
  const pick = (role: NoteRole) => roles.flatMap((value, pitch) => value === role ? [toPitchClass(pitch)] : []);
  const third = pick('third');
  const seventh = pick('seventh');
  const targets = [...third, ...(seventh.length ? seventh : pick('root'))];
  return {
    chord,
    function: fn,
    scale,
    roles,
    targets,
    ...(chord.bass !== undefined && chord.bass !== chord.root ? { bass: chord.bass } : {}),
  };
};

/** Scales that fit every diatonic chord of the key — the "safe" choice for a whole section. */
export const keySafeScales = (key: MusicalKey): ChordScale[] => key.mode === 'major'
  ? [
      { root: key.tonic, type: 'majorPentatonic' },
      { root: transposePitch(key.tonic, 9), type: 'minorPentatonic', reason: '與大調五聲同音，只是從關係小調開始' },
      { root: key.tonic, type: 'major' },
    ]
  : [
      { root: key.tonic, type: 'minorPentatonic' },
      { root: key.tonic, type: 'blues', reason: '小調五聲加上 ♭5 藍調音' },
      { root: key.tonic, type: 'naturalMinor' },
    ];

export interface GuideToneMove {
  from: PitchClass;
  to: PitchClass;
  /** Signed smallest motion in semitones; 0 means a common tone. */
  semitones: number;
}

const signedDistance = (from: PitchClass, to: PitchClass): number => {
  const up = toPitchClass(to - from);
  return up > 6 ? up - 12 : up;
};

/** Smallest guide-tone motion between two chords, e.g. B (G) → C (C) is +1. */
export const guideToneMove = (
  previous: ChordSoloAnalysis,
  next: ChordSoloAnalysis
): GuideToneMove | null => {
  let best: GuideToneMove | null = null;
  previous.targets.forEach(from => next.targets.forEach(to => {
    const semitones = signedDistance(from, to);
    if (!best || Math.abs(semitones) < Math.abs(best.semitones)) best = { from, to, semitones };
  }));
  return best;
};
