import { beforeEach, describe, expect, it, vi } from 'vitest';
import { guitarOptions, isValidRange, keyLabel, keyTonic, loadVocalRange, noteName, rankKeyShifts, saveVocalRange } from './keySuggest';

const OPEN = new Set(['C', 'G', 'D', 'A', 'E', 'Am', 'Em', 'Dm', 'G7', 'C7', 'D7', 'A7', 'E7']);
const difficulty = (symbol: string) => (OPEN.has(symbol) ? 0 : 2);

describe('key suggestions', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    });
  });

  it('names notes', () => {
    expect(noteName(60)).toBe('C4');
    expect(noteName(45)).toBe('A2');
    expect(noteName(70)).toBe('Bb4');
  });

  it('centres the song in the singer range', () => {
    // A female-range song for a male singer should come down about a fifth.
    const best = rankKeyShifts({ low: 57, high: 73 }, { low: 48, high: 67 })[0];
    expect(best.tooHigh + best.tooLow).toBe(0);
    expect(best.shift).toBeLessThanOrEqual(-6);
    // Same range: no change.
    expect(rankKeyShifts({ low: 50, high: 66 }, { low: 48, high: 68 })[0].shift).toBe(0);
  });

  it('reports strain when the song is wider than the singer', () => {
    const [best] = rankKeyShifts({ low: 48, high: 72 }, { low: 50, high: 67 });
    expect(best.tooHigh + best.tooLow).toBe(7);
  });

  it('picks a capo that turns barre chords into open shapes', () => {
    // Bb F Gm Eb is all barres; with capo 3 it becomes G D Em C.
    const [best] = guitarOptions(['Bb', 'F', 'Gm', 'Eb', 'Bb'], 0, 0, difficulty);
    expect(best.capo).toBe(3);
    expect(best.transpose).toBe(-3);
    expect(best.shapes).toEqual(['G', 'D', 'Em', 'C']);
    expect(best.hardShapes).toEqual([]);
  });

  it('accounts for the capo already on and the key change', () => {
    // Shapes G D Em C at capo 2 sound in A; to sing in G play at capo 0 with the same shapes.
    const [best] = guitarOptions(['G', 'D', 'Em', 'C'], 2, -2, difficulty);
    expect(best).toMatchObject({ capo: 0, transpose: 0, hardShapes: [] });
  });

  it('prefers no capo when shapes are equally easy', () => {
    const [best] = guitarOptions(['C', 'G', 'Am'], 0, 0, difficulty);
    expect(best.capo).toBe(0);
  });

  it('reads keys and remembers the singer range', () => {
    expect(keyTonic('E')).toEqual({ tonic: 4, minor: false });
    expect(keyTonic('C#m')).toEqual({ tonic: 1, minor: true });
    expect(keyTonic('')).toBeNull();
    expect(keyLabel(10, false)).toBe('Bb');
    expect(keyLabel(1, true)).toBe('C#m');
    expect(loadVocalRange()).toBeNull();
    saveVocalRange({ low: 48, high: 67 });
    expect(loadVocalRange()).toEqual({ low: 48, high: 67 });
    expect(isValidRange({ low: 60, high: 50 })).toBe(false);
  });
});
