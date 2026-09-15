import { describe, expect, it } from 'vitest';
import { detectChordFromColumn, detectChordName } from './chordDetector';

describe('chordDetector', () => {
  it('prefers an exact curated library match', () => {
    expect(detectChordName(
      [0, 1, 0, 2, 3, null],
      [{ name: 'My C', frets: [0, 1, 0, 2, 3, null] }]
    )).toBe('My C');
  });

  it('recognizes chord tones when the exact shape is not curated', () => {
    expect(detectChordName([0, 1, 0, 2, 3, null], [])).toBe('C');
    expect(detectChordName([0, 1, 0, 2, 0, null], [])).toBe('Am7');
  });

  it('returns a generated name in the detected chord definition', () => {
    expect(detectChordFromColumn(['0', '1', '0', '2', '3', '-'], []))
      .toEqual({ name: 'C', frets: [0, 1, 0, 2, 3, null] });
  });
});
