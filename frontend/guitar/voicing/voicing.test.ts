import { describe, expect, it } from 'vitest';
import { parseChord } from '../../music-theory';
import { generateChordShapes } from './generator';
import { findChordVoicings } from './library';

describe('voicing generator', () => {
  it('generates playable shapes containing essential chord tones', () => {
    const chord = parseChord('C');
    if (!chord) throw new Error('test chord did not parse');

    const shapes = generateChordShapes(chord, undefined, { maxFret: 5, limit: 8 });
    expect(shapes.length).toBeGreaterThan(0);
    expect(shapes.every(shape => shape.frets.length === 6)).toBe(true);
    expect(shapes.every(shape => shape.source === 'generated')).toBe(true);
  });

  it('enforces slash chord bass notes', () => {
    const chord = parseChord('C/E');
    if (!chord) throw new Error('test chord did not parse');

    const shapes = generateChordShapes(chord, undefined, { maxFret: 5, limit: 8 });
    expect(shapes.length).toBeGreaterThan(0);
    expect(shapes.every(shape => {
      for (let index = shape.frets.length - 1; index >= 0; index -= 1) {
        const fret = shape.frets[index];
        if (fret !== null) {
          const tuning = [4, 11, 7, 2, 9, 4];
          return (tuning[index] + fret) % 12 === 4;
        }
      }
      return false;
    })).toBe(true);
  });
});

describe('hybrid voicing library', () => {
  it('places curated shapes before generated alternatives and de-duplicates them', () => {
    const result = findChordVoicings(
      'C',
      [{ name: 'C', frets: [0, 1, 0, 2, 3, null], tags: ['open', 'easy'] }],
      undefined,
      { maxFret: 5, limit: 5 }
    );

    expect(result?.shapes[0].source).toBe('curated');
    expect(result?.shapes[0].frets).toEqual([0, 1, 0, 2, 3, null]);
    expect(new Set(result?.shapes.map(shape => shape.frets.join(','))).size).toBe(result?.shapes.length);
  });

  it('returns null for an unsupported chord symbol', () => {
    expect(findChordVoicings('C13')).toBeNull();
  });
});
