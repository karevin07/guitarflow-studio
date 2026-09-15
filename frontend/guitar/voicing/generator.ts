import {
  Chord,
  getChordPitchClasses,
  getEssentialPitchClasses,
} from '../../music-theory';
import { fretsForPitchClasses, noteAt } from '../fretboard';
import { GuitarTuning, STANDARD_TUNING } from '../tuning';
import { scoreChordShape, fretSpan } from './scorer';
import { ChordShape, VoicingSearchOptions } from './types';

const DEFAULT_OPTIONS: Required<VoicingSearchOptions> = {
  maxFret: 12,
  maxSpan: 4,
  minStrings: 3,
  limit: 24,
};

const tagsFor = (frets: Array<number | null>): ChordShape['tags'] => {
  const tags: ChordShape['tags'] = [];
  if (frets.includes(0)) tags.push('open');
  if (fretSpan(frets) <= 3) tags.push('easy');
  return tags;
};

export const generateChordShapes = (
  chord: Chord,
  tuning: GuitarTuning = STANDARD_TUNING,
  options: VoicingSearchOptions = {}
): ChordShape[] => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const chordPitches = new Set(getChordPitchClasses(chord));
  const essentialPitches = getEssentialPitchClasses(chord);
  const candidates = tuning.strings.map(openString => [
    null,
    ...fretsForPitchClasses(openString, chordPitches, config.maxFret),
  ]);
  const shapes: ChordShape[] = [];
  const current: Array<number | null> = [];

  const search = (stringIndex: number, playedCount: number) => {
    if (playedCount + (tuning.strings.length - stringIndex) < config.minStrings) return;

    if (stringIndex === tuning.strings.length) {
      if (playedCount < config.minStrings || fretSpan(current) > config.maxSpan) return;

      const notes = new Set(current.flatMap((fret, index) =>
        fret === null ? [] : [noteAt(tuning.strings[index], fret)]
      ));
      if (!essentialPitches.every(pitch => notes.has(pitch))) return;
      if (chord.bass !== undefined) {
        let bassString = -1;
        for (let index = current.length - 1; index >= 0; index -= 1) {
          if (current[index] !== null) {
            bassString = index;
            break;
          }
        }
        if (bassString < 0 || noteAt(tuning.strings[bassString], current[bassString]!) !== chord.bass) return;
      }

      shapes.push({
        frets: [...current],
        score: scoreChordShape(chord, current, tuning),
        source: 'generated',
        tags: tagsFor(current),
      });
      return;
    }

    for (const fret of candidates[stringIndex]) {
      current.push(fret);
      if (fretSpan(current) <= config.maxSpan) {
        search(stringIndex + 1, playedCount + (fret === null ? 0 : 1));
      }
      current.pop();
    }
  };

  search(0, 0);
  return shapes
    .sort((a, b) => b.score - a.score)
    .slice(0, config.limit);
};
