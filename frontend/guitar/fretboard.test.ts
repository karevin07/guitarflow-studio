import { describe, expect, it } from 'vitest';
import { fretsForPitchClasses, generateFretboard, noteAt } from './fretboard';
import { STANDARD_TUNING } from './tuning';

describe('fretboard', () => {
  it('calculates notes using pitch classes', () => {
    expect(noteAt(4, 0)).toBe(4);
    expect(noteAt(4, 8)).toBe(0);
    expect(noteAt(11, 1)).toBe(0);
  });

  it('generates all strings through the requested fret', () => {
    const board = generateFretboard(STANDARD_TUNING, 12);
    expect(board).toHaveLength(6);
    expect(board[0]).toHaveLength(13);
    expect(board[0][0]).toBe(board[0][12]);
  });

  it('finds matching frets on a string', () => {
    expect(fretsForPitchClasses(4, new Set([0, 4, 7]), 8)).toEqual([0, 3, 8]);
  });

  it('rejects invalid fret ranges', () => {
    expect(() => noteAt(4, -1)).toThrow(RangeError);
    expect(() => generateFretboard(STANDARD_TUNING, 1.5)).toThrow(RangeError);
  });
});
