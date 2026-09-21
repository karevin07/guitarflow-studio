import { describe, expect, it } from 'vitest';
import { detectChordCandidates, detectChordFromColumn, detectChordName, labelChordColumn } from './chordDetector';
import { TabSection } from '../types';

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

  it('keeps the played shape when its detected name also exists in the library', () => {
    expect(detectChordFromColumn(
      ['0', '1', '0', '2', '3', '-'],
      [{ name: 'C', frets: [3, 5, 5, 5, 3, null] }]
    )).toEqual({ name: 'C', frets: [0, 1, 0, 2, 3, null] });
  });

  it('shows alternate names for an ambiguous pitch set', () => {
    const result = detectChordCandidates([0, 1, 0, 2, 0, null], []);
    expect(result.candidates.map(candidate => candidate.name)).toEqual(expect.arrayContaining(['C6', 'Am7']));
    expect(result.candidates[0].reason).toBeTruthy();
    expect(result.notes.length).toBeGreaterThanOrEqual(3);
  });

  it('prioritizes an exact custom shape and labels it clearly', () => {
    const frets = [0, 1, 0, 2, 3, null];
    const result = detectChordCandidates(frets, [{ name: 'My C', frets }]);
    expect(result.candidates[0]).toMatchObject({ name: 'My C', confidence: 'high', exactShape: true });
  });

  it('keeps the entered notes unchanged when confirming a candidate', () => {
    const section: TabSection = {
      id: 'verse', title: 'Verse', capo: 0,
      measures: [[['0'], ['1'], ['0'], ['2'], ['3'], ['-']]],
      chords: [[null]], lyrics: [[null]],
    };
    const original = [section];
    const updated = labelChordColumn(original, 'verse', 0, 0, 'C');
    expect(updated[0].chords[0][0]).toBe('C');
    expect(updated[0].measures).toBe(section.measures);
    expect(original[0].chords[0][0]).toBeNull();
  });
});
