import { describe, expect, it } from 'vitest';
import { GuitarSong, ImportedSong } from '../types';
import { commonChords, displayNameFor, greetingFor, songKeyLabel } from './libraryInsights';

const row = (cells: Record<number, string>) => Array.from({ length: 16 }, (_, index) => cells[index] ?? null);
const song = (id: string, chords: Array<Record<number, string>>): GuitarSong => ({
  id, title: id, lastModified: 0, customChords: [], voicingPlan: {}, transposeOffset: 0,
  sections: [{ id: 's', title: 'Verse', capo: 0, measures: [], chords: chords.map(row), lyrics: [] }],
});
const imported: ImportedSong = { id: 'gp', title: 'GP', lastModified: 0, source: 'imported', importFormat: 'gp', fileName: 'a.gp' };

describe('greetingFor', () => {
  it.each([[7, '早安'], [13, '午安'], [21, '晚上好'], [2, '夜深了']])('%i:00 → %s', (hour, expected) => {
    expect(greetingFor(new Date(2026, 8, 29, hour))).toBe(expected);
  });
});

describe('commonChords', () => {
  it('ranks chords by how often they appear in the user songs', () => {
    const songs = [song('a', [{ 0: 'C', 8: 'G' }, { 0: 'Am', 8: 'G' }]), song('b', [{ 0: 'G', 8: 'D' }]), imported];
    expect(commonChords(songs)).toEqual(['G', 'C', 'Am', 'D']);
    expect(commonChords(songs, 2)).toEqual(['G', 'C']);
  });

  it('is empty without chords', () => {
    expect(commonChords([])).toEqual([]);
    expect(commonChords([imported])).toEqual([]);
  });
});

describe('songKeyLabel', () => {
  it('detects the key instead of reading the first chord', () => {
    expect(songKeyLabel(song('a', [{ 0: 'Am', 8: 'F' }, { 0: 'C', 8: 'G' }, { 0: 'Am' }]))).toBe('Am');
    expect(songKeyLabel(song('b', [{ 0: 'G' }, { 0: 'D' }, { 0: 'Em' }, { 0: 'C' }, { 0: 'G' }]))).toBe('G');
    expect(songKeyLabel(song('c', [{}]))).toBeNull();
  });
});

describe('displayNameFor', () => {
  it('uses the part before @ and clips long names', () => {
    expect(displayNameFor('player@example.com')).toBe('karevin07');
    expect(displayNameFor('e2e_review_1790648569435')).toBe('e2e_review_1790…');
    expect(displayNameFor(undefined)).toBe('吉他手');
  });
});
