import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TabSection } from '../types';
import { chordSlots, defaultEditMode, loadEditMode, lyricSlots, saveEditMode } from './lyricsEditor';

const row = (cells: Record<number, string>) => Array.from({ length: 16 }, (_, index) => cells[index] ?? null);
const empty = () => Array.from({ length: 6 }, () => Array(16).fill('-'));
const section = (measure: string[][]): TabSection => ({ id: 's', title: 'V', capo: 0, measures: [measure], chords: [row({})], lyrics: [row({})] });

describe('edit mode', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    });
  });

  it('opens lead sheets in the lyrics editor and tabs in the tab editor', () => {
    expect(defaultEditMode([section(empty())])).toBe('lyrics');
    const tab = empty();
    tab[1][3] = '5';
    expect(defaultEditMode([section(tab)])).toBe('tab');
  });

  it('remembers the choice per song', () => {
    expect(loadEditMode('9', [section(empty())])).toBe('lyrics');
    saveEditMode('9', 'tab');
    expect(loadEditMode('9', [section(empty())])).toBe('tab');
    expect(loadEditMode('10', [section(empty())])).toBe('lyrics');
  });
});

describe('slots', () => {
  it('gives every beat a chord box and keeps off-beat chords', () => {
    expect(chordSlots(row({}))).toEqual([{ col: 0, span: 4 }, { col: 4, span: 4 }, { col: 8, span: 4 }, { col: 12, span: 4 }]);
    expect(chordSlots(row({ 0: 'C', 6: 'G' })).map(slot => slot.col)).toEqual([0, 4, 6, 8, 12]);
  });

  it('stretches lyric boxes to the next chord or lyric', () => {
    expect(lyricSlots(row({}), row({}))).toEqual([{ col: 0, span: 16 }]);
    expect(lyricSlots(row({ 0: 'C', 8: 'G' }), row({ 0: '喔愛' }))).toEqual([{ col: 0, span: 8 }, { col: 8, span: 8 }]);
    expect(lyricSlots(row({ 8: 'G' }), row({ 2: 'la' }))).toEqual([{ col: 0, span: 2 }, { col: 2, span: 6 }, { col: 8, span: 8 }]);
  });
});
