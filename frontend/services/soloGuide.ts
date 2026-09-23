import {
  AccidentalPreference,
  ChordScale,
  ChordSoloAnalysis,
  NoteRole,
  PitchClass,
  formatPitch,
  getScalePitchClasses,
  toPitchClass,
} from '../music-theory';
import { FretPosition, notesInWindow } from '../guitar';

export type NoteLabelMode = 'name' | 'degree';

export type FretMarkRole = Exclude<NoteRole, 'outside'> | 'scale';

export interface FretMark {
  role: FretMarkRole;
  label: string;
}

const SCALE_DEGREES = ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];
// Non-chord tones over a chord read as extensions.
const TENSION_DEGREES: Record<number, string> = { 1: '♭9', 2: '9', 3: '♯9', 5: '11', 6: '♯11', 8: '♭13', 9: '13' };

export const chordDegreeLabel = (interval: number, isChordTone: boolean): string =>
  (!isChordTone && TENSION_DEGREES[interval]) || SCALE_DEGREES[interval];

export const buildChordMarks = (
  analysis: ChordSoloAnalysis,
  labelMode: NoteLabelMode,
  preference: AccidentalPreference
): Array<FretMark | null> => analysis.roles.map((role, pitch) => {
  if (role === 'outside') return null;
  const interval = toPitchClass(pitch - analysis.chord.root);
  const isChordTone = role === 'root' || role === 'third' || role === 'fifth' || role === 'seventh';
  return {
    role,
    label: labelMode === 'name'
      ? formatPitch(toPitchClass(pitch), preference)
      : chordDegreeLabel(interval, isChordTone),
  };
});

export const buildScaleMarks = (
  scale: ChordScale,
  labelMode: NoteLabelMode,
  preference: AccidentalPreference
): Array<FretMark | null> => {
  const pitches = new Set(getScalePitchClasses(scale.root, scale.type));
  return Array.from({ length: 12 }, (_, value) => {
    const pitch = toPitchClass(value);
    if (!pitches.has(pitch)) return null;
    return {
      role: pitch === scale.root ? 'root' : 'scale',
      label: labelMode === 'name'
        ? formatPitch(pitch, preference)
        : SCALE_DEGREES[toPitchClass(pitch - scale.root)],
    };
  });
};

const STRING_LABELS = ['1 弦 (e)', '2 弦 (B)', '3 弦 (G)', '4 弦 (D)', '5 弦 (A)', '6 弦 (E)'];

export const describeFretPosition = (position: FretPosition): string =>
  `${STRING_LABELS[position.stringIndex]} ${position.fret} 格`;

/** Where to play a pitch inside a fret range, treble strings first (they carry a melody best). */
export const positionsForPitch = (
  pitch: PitchClass,
  range: { from: number; to: number },
  limit = 2
): FretPosition[] => notesInWindow(new Set([pitch]), range.from, range.to)
  .sort((a, b) => a.stringIndex - b.stringIndex || a.fret - b.fret)
  .slice(0, limit);

export const describeMotion = (semitones: number): string => {
  if (semitones === 0) return '保持共同音';
  const direction = semitones > 0 ? '上行' : '下行';
  const size = Math.abs(semitones);
  return `${direction}${size === 1 ? '半音' : size === 2 ? '全音' : ` ${size} 個半音`}`;
};
