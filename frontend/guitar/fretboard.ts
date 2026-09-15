import { PitchClass, transposePitch } from '../music-theory';
import { GuitarTuning, STANDARD_TUNING } from './tuning';

export const noteAt = (openString: PitchClass, fret: number): PitchClass => {
  if (!Number.isInteger(fret) || fret < 0) {
    throw new RangeError('Fret must be a non-negative integer');
  }
  return transposePitch(openString, fret);
};

export const generateFretboard = (
  tuning: GuitarTuning = STANDARD_TUNING,
  maxFret = 24
): PitchClass[][] => {
  if (!Number.isInteger(maxFret) || maxFret < 0) {
    throw new RangeError('maxFret must be a non-negative integer');
  }
  return tuning.strings.map(openString =>
    Array.from({ length: maxFret + 1 }, (_, fret) => noteAt(openString, fret))
  );
};

export const fretsForPitchClasses = (
  openString: PitchClass,
  pitches: ReadonlySet<PitchClass>,
  maxFret: number
): number[] => Array.from({ length: maxFret + 1 }, (_, fret) => fret)
  .filter(fret => pitches.has(noteAt(openString, fret)));
