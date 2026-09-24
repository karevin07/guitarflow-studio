import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TabSection } from '../types';
import {
  describeKey,
  displaySpelling,
  loadCapoViewMode,
  primaryCapo,
  saveCapoViewMode,
  sectionDisplayShift,
  shiftChordForDisplay,
  shiftedSongKey,
} from './capoView';

const row = (cells: Record<number, string>) => Array.from({ length: 16 }, (_, index) => cells[index] ?? null);
const section = (capo: number, chords: Array<Record<number, string>>): TabSection => ({
  id: `s${capo}`, title: 'S', capo, measures: [], chords: chords.map(row), lyrics: [],
});

const MAGIC_POTION = [section(4, [{ 0: 'C' }, { 0: 'E' }, { 0: 'Am' }, { 0: 'F' }, { 0: 'G' }, { 0: 'Dm7' }])];
const NO_ONE_LIKE_ME = [section(3, [{ 0: 'G' }, { 0: 'Bm/F#' }, { 0: 'Em' }, { 0: 'C' }, { 0: 'D' }, { 0: 'G' }])];

describe('capo view', () => {
  it('shifts by the capo only when the capo is dropped', () => {
    expect(sectionDisplayShift(4, 0, 'shape')).toBe(0);
    expect(sectionDisplayShift(4, 0, 'concert')).toBe(4);
    expect(sectionDisplayShift(4, -1, 'concert')).toBe(3);
  });

  it('turns capo 4 in C into E without a capo', () => {
    const spelling = displaySpelling(MAGIC_POTION, 4);
    expect(['C', 'Am', 'F', 'G', 'E', 'Dm7'].map(symbol => shiftChordForDisplay(symbol, 4, spelling)))
      .toEqual(['E', 'C#m', 'A', 'B', 'G#', 'F#m7']);
    expect(describeKey(shiftedSongKey(MAGIC_POTION, 0))).toBe('C');
    expect(describeKey(shiftedSongKey(MAGIC_POTION, 4))).toBe('E');
  });

  it('spells flat keys with flats', () => {
    const spelling = displaySpelling(NO_ONE_LIKE_ME, 3);
    expect(describeKey(shiftedSongKey(NO_ONE_LIKE_ME, 3))).toBe('Bb');
    expect(['G', 'Bm/F#', 'D'].map(symbol => shiftChordForDisplay(symbol, 3, spelling))).toEqual(['Bb', 'Dm/A', 'F']);
  });

  it('reads the capo from the first section with chords', () => {
    expect(primaryCapo([section(0, [{}]), ...MAGIC_POTION])).toBe(4);
    expect(primaryCapo([])).toBe(0);
  });
});

describe('capo view storage', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    });
  });

  it('remembers the choice per song', () => {
    expect(loadCapoViewMode('21')).toBe('shape');
    saveCapoViewMode('21', 'concert');
    expect(loadCapoViewMode('21')).toBe('concert');
    expect(loadCapoViewMode('9')).toBe('shape');
    saveCapoViewMode('21', 'shape');
    expect(loadCapoViewMode('21')).toBe('shape');
  });
});
