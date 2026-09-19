import { describe, expect, it } from 'vitest';
import { getVoicingPosition } from '../guitar';
import { TabSection } from '../types';
import { extractChordProgression, planSongVoicings, voicingTransitionCost } from './voicingPlanner';

const sectionWith = (...symbols: string[]): TabSection => ({
  id: 'section',
  title: 'Verse',
  capo: 0,
  measures: [[Array(16).fill('-'), Array(16).fill('-'), Array(16).fill('-'), Array(16).fill('-'), Array(16).fill('-'), Array(16).fill('-')]],
  chords: [[...symbols, ...Array(Math.max(0, 16 - symbols.length)).fill(null)]],
  lyrics: [Array(16).fill(null)],
});

describe('song voicing planner', () => {
  it('extracts a transposed progression and removes adjacent repeats', () => {
    expect(extractChordProgression([sectionWith('C', 'C', 'Am', 'F', 'G')], 2)).toEqual([
      { sourceSymbol: 'C', effectiveSymbol: 'D' },
      { sourceSymbol: 'Am', effectiveSymbol: 'Bm' },
      { sourceSymbol: 'F', effectiveSymbol: 'G' },
      { sourceSymbol: 'G', effectiveSymbol: 'A' },
    ]);
  });

  it('creates one persistent suggestion per chord symbol', () => {
    const result = planSongVoicings({ sections: [sectionWith('C', 'Am', 'F', 'G', 'C')], chordLibrary: [] });
    expect(result.suggestions.map(item => item.sourceSymbol)).toEqual(['C', 'Am', 'F', 'G']);
    expect(Object.keys(result.plan)).toEqual(['C', 'Am', 'F', 'G']);
    expect(result.suggestions.every(item => item.shape.frets.length === 6)).toBe(true);
  });

  it('preserves an applicable locked shape', () => {
    const lockedFrets = [8, 8, 9, 10, 10, 8];
    const result = planSongVoicings({
      sections: [sectionWith('C', 'Am', 'F')],
      chordLibrary: [],
      existingPlan: {
        C: { position: 'middle', lockedShape: { symbol: 'C', name: 'C', frets: lockedFrets } },
      },
    });
    const suggestion = result.suggestions.find(item => item.sourceSymbol === 'C');
    expect(suggestion?.locked).toBe(true);
    expect(suggestion?.shape.frets).toEqual(lockedFrets);
  });

  it('respects a saved high-position preference', () => {
    const result = planSongVoicings({
      sections: [sectionWith('C', 'Am')],
      chordLibrary: [],
      existingPlan: { C: { position: 'high' } },
    });
    const suggestion = result.suggestions.find(item => item.sourceSymbol === 'C');
    expect(suggestion && getVoicingPosition(suggestion.shape.frets)).toBe('high');
  });

  it('prefers a familiar complete open shape over sparse generated alternatives', () => {
    const openC = [0, 1, 0, 2, 3, null];
    const result = planSongVoicings({
      sections: [sectionWith('C')],
      chordLibrary: [{ name: 'C', frets: openC }],
      strategy: 'easy',
    });
    expect(result.suggestions[0].shape.frets).toEqual(openC);
  });

  it('scores nearby shapes below large position jumps', () => {
    const base = { score: 100, source: 'generated' as const, tags: [] };
    const low = { ...base, frets: [0, 1, 0, 2, 3, null] };
    const nearby = { ...base, frets: [1, 1, 0, 2, 3, null] };
    const distant = { ...base, frets: [10, 9, 9, 10, 10, 8] };
    expect(voicingTransitionCost(low, nearby)).toBeLessThan(voicingTransitionCost(low, distant));
  });
});
