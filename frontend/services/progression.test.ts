import { describe, expect, it } from 'vitest';
import { TabSection } from '../types';
import { chordAtPosition, sectionChordSteps, stepIndexAt } from './progression';

const row = (cells: Record<number, string>) => Array.from({ length: 16 }, (_, index) => cells[index] ?? null);
const section: TabSection = {
  id: 's1',
  title: 'Verse',
  capo: 2,
  measures: [],
  chords: [row({ 0: 'C', 8: 'G' }), row({ 0: 'G', 8: 'Am' }), row({})],
  lyrics: [],
};

describe('sectionChordSteps', () => {
  it('collapses repeated chords and keeps their first position', () => {
    expect(sectionChordSteps(section).map(step => [step.sourceSymbol, step.measureIdx, step.colIdx])).toEqual([
      ['C', 0, 0],
      ['G', 0, 8],
      ['Am', 1, 8],
    ]);
  });

  it('applies the transpose offset', () => {
    expect(sectionChordSteps(section, 2).map(step => step.effectiveSymbol)).toEqual(['D', 'A', 'Bm']);
  });
});

describe('stepIndexAt', () => {
  const steps = sectionChordSteps(section);
  it('finds the sounding chord', () => {
    expect(stepIndexAt(steps, 0, 4)).toBe(0);
    expect(stepIndexAt(steps, 1, 3)).toBe(1);
    expect(stepIndexAt(steps, 2, 0)).toBe(2);
  });
});

describe('chordAtPosition', () => {
  it('looks back within the measure', () => {
    expect(chordAtPosition([section], { sectionIdx: 0, measureIdx: 0, colIdx: 10 })).toBe('G');
    expect(chordAtPosition([section], null)).toBeNull();
  });
});
