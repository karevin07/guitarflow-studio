import { AccidentalPreference, PitchClass, formatPitch, transposePitch } from './pitch';

export type ScaleType =
  | 'major'
  | 'naturalMinor'
  | 'majorPentatonic'
  | 'minorPentatonic'
  | 'blues'
  | 'mixolydian'
  | 'dorian'
  | 'harmonicMinor';

export interface ScaleFormula {
  type: ScaleType;
  intervals: readonly number[];
  label: string;
}

export const SCALE_FORMULAS: Record<ScaleType, ScaleFormula> = {
  major: { type: 'major', intervals: [0, 2, 4, 5, 7, 9, 11], label: '大調音階' },
  naturalMinor: { type: 'naturalMinor', intervals: [0, 2, 3, 5, 7, 8, 10], label: '自然小調音階' },
  majorPentatonic: { type: 'majorPentatonic', intervals: [0, 2, 4, 7, 9], label: '大調五聲' },
  minorPentatonic: { type: 'minorPentatonic', intervals: [0, 3, 5, 7, 10], label: '小調五聲' },
  blues: { type: 'blues', intervals: [0, 3, 5, 6, 7, 10], label: '藍調音階' },
  mixolydian: { type: 'mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], label: 'Mixolydian' },
  dorian: { type: 'dorian', intervals: [0, 2, 3, 5, 7, 9, 10], label: 'Dorian' },
  harmonicMinor: { type: 'harmonicMinor', intervals: [0, 2, 3, 5, 7, 8, 11], label: '和聲小調' },
};

export const getScalePitchClasses = (root: PitchClass, type: ScaleType): PitchClass[] =>
  SCALE_FORMULAS[type].intervals.map(interval => transposePitch(root, interval));

export const formatScale = (
  root: PitchClass,
  type: ScaleType,
  preference: AccidentalPreference = 'sharp'
): string => `${formatPitch(root, preference)} ${SCALE_FORMULAS[type].label}`;
