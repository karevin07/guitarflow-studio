import { formatChord, parseChord } from '../../music-theory';
import { GuitarTuning, STANDARD_TUNING } from '../tuning';
import { generateChordShapes } from './generator';
import { scoreChordShape } from './scorer';
import {
  ChordShape,
  ChordVoicingResult,
  CuratedVoicing,
  VoicingSearchOptions,
} from './types';

const sameChord = (left: string, right: string): boolean => {
  const a = parseChord(left);
  const b = parseChord(right);
  return Boolean(a && b && a.root === b.root && a.quality === b.quality && a.bass === b.bass);
};

const shapeKey = (frets: Array<number | null>): string => frets.map(fret => fret ?? 'x').join(',');

export const findChordVoicings = (
  symbol: string,
  curatedLibrary: CuratedVoicing[] = [],
  tuning: GuitarTuning = STANDARD_TUNING,
  options: VoicingSearchOptions = {}
): ChordVoicingResult | null => {
  const chord = parseChord(symbol);
  if (!chord) return null;

  const curated: ChordShape[] = curatedLibrary
    .filter(voicing => sameChord(voicing.name, symbol))
    .filter(voicing => voicing.frets.length === tuning.strings.length)
    .map(voicing => ({
      frets: [...voicing.frets],
      fingers: voicing.fingers,
      barres: voicing.barres,
      score: scoreChordShape(chord, voicing.frets, tuning) + 30 - (voicing.difficulty ?? 0) * 2,
      source: 'curated' as const,
      tags: voicing.tags ?? (voicing.frets.includes(0) ? ['open'] : []),
    }));

  const seen = new Set(curated.map(shape => shapeKey(shape.frets)));
  const generated = generateChordShapes(chord, tuning, options)
    .filter(shape => !seen.has(shapeKey(shape.frets)));
  const limit = options.limit ?? 24;

  return {
    chord,
    symbol: formatChord(chord),
    shapes: [...curated.sort((a, b) => b.score - a.score), ...generated].slice(0, limit),
  };
};
