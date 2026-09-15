import { Chord, getEssentialPitchClasses } from '../../music-theory';
import { noteAt } from '../fretboard';
import { GuitarTuning, STANDARD_TUNING } from '../tuning';
import { ChordShape } from './types';

export const playedFrets = (frets: Array<number | null>): number[] =>
  frets.filter((fret): fret is number => fret !== null);

export const fretSpan = (frets: Array<number | null>): number => {
  const pressed = playedFrets(frets).filter(fret => fret > 0);
  return pressed.length < 2 ? 0 : Math.max(...pressed) - Math.min(...pressed);
};

export const lowestPlayedPitch = (
  frets: Array<number | null>,
  tuning: GuitarTuning = STANDARD_TUNING
) => {
  for (let stringIndex = frets.length - 1; stringIndex >= 0; stringIndex -= 1) {
    const fret = frets[stringIndex];
    if (fret !== null) return noteAt(tuning.strings[stringIndex], fret);
  }
  return null;
};

export const scoreChordShape = (
  chord: Chord,
  frets: Array<number | null>,
  tuning: GuitarTuning = STANDARD_TUNING
): number => {
  const notes = frets.flatMap((fret, stringIndex) =>
    fret === null ? [] : [noteAt(tuning.strings[stringIndex], fret)]
  );
  const noteSet = new Set(notes);
  const essentialCoverage = getEssentialPitchClasses(chord)
    .filter(pitch => noteSet.has(pitch)).length;
  const openStrings = frets.filter(fret => fret === 0).length;
  const mutedStrings = frets.filter(fret => fret === null).length;
  const pressed = playedFrets(frets).filter(fret => fret > 0);
  const lowestFret = pressed.length ? Math.min(...pressed) : 0;
  const bass = lowestPlayedPitch(frets, tuning);

  let score = 100;
  score += essentialCoverage * 8;
  score += openStrings * 3;
  score += bass === (chord.bass ?? chord.root) ? 12 : 0;
  score -= fretSpan(frets) * 8;
  score -= mutedStrings * 3;
  score -= Math.max(0, lowestFret - 1) * 1.5;
  score -= new Set(pressed).size > 4 ? 8 : 0;
  return Math.round(score * 10) / 10;
};

export const rankChordShapes = (shapes: ChordShape[]): ChordShape[] =>
  [...shapes].sort((a, b) => b.score - a.score || a.frets.join(',').localeCompare(b.frets.join(',')));
