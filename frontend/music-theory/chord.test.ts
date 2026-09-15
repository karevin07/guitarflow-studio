import { describe, expect, it } from 'vitest';
import {
  formatChord,
  getChordPitchClasses,
  parseChord,
  transposeChordSymbol,
} from './chord';

describe('chord parser and formatter', () => {
  it.each([
    ['C', 'major', undefined],
    ['Cm', 'minor', undefined],
    ['C7', '7', undefined],
    ['Cmaj7', 'maj7', undefined],
    ['C#m7', 'min7', undefined],
    ['F/G', 'major', 7],
    ['Bbadd9', 'add9', undefined],
  ])('parses %s', (symbol, quality, bass) => {
    const chord = parseChord(symbol);
    expect(chord?.quality).toBe(quality);
    expect(chord?.bass).toBe(bass);
    expect(chord && formatChord(chord)).toBe(symbol);
  });

  it('rejects unsupported or malformed symbols', () => {
    expect(parseChord('H7')).toBeNull();
    expect(parseChord('C13')).toBeNull();
    expect(parseChord('C/E/G')).toBeNull();
  });

  it('builds pitch classes from interval formulae', () => {
    const chord = parseChord('Cmaj7');
    expect(chord && getChordPitchClasses(chord)).toEqual([0, 4, 7, 11]);
  });

  it('transposes roots and slash bass notes while retaining flat spelling', () => {
    expect(transposeChordSymbol('C/E', 2)).toBe('D/F#');
    expect(transposeChordSymbol('Bbmaj7', -2)).toBe('Abmaj7');
    expect(transposeChordSymbol('not-a-chord', 2)).toBe('not-a-chord');
  });
});
