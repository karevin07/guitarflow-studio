import { describe, it, expect } from 'vitest';
import { gflowFileName, serializeGflow } from './gflowExport';
import { parseGflowText } from './gflowImport';

const section = (id: string, title: string) => ({
  id,
  title,
  capo: 2,
  timeSignature: [3, 4] as [number, number],
  pattern: 'D DU UDU',
  measures: [Array.from({ length: 6 }, () => Array(16).fill('-'))],
  chords: [['G', ...Array(15).fill(null)]],
  lyrics: [['你好', ...Array(15).fill(null)]],
});

describe('serializeGflow', () => {
  it('round-trips through the importer', () => {
    const sections = [section('a', '主歌'), section('b', '副歌')];
    const text = serializeGflow({
      title: '小幸運',
      artist: '田馥甄',
      originalKey: 'E',
      tags: ['民謠'],
      sections,
      customChords: [{ name: 'Gadd9', frets: [3, 0, 0, 2, 0, 3] }],
      voicingPlan: {},
      transposeOffset: -2,
      bpm: 84,
      form: [{ sectionId: 'b', repeat: 2 }, { sectionId: 'gone', repeat: 1 }],
    });
    const result = parseGflowText(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      title: '小幸運',
      artist: '田馥甄',
      originalKey: 'E',
      tags: ['民謠'],
      transposeOffset: -2,
      bpm: 84,
      customChords: [{ name: 'Gadd9', frets: [3, 0, 0, 2, 0, 3] }],
      form: [{ section: 1, repeat: 2 }],
    });
    expect(result.data.sections).toEqual(sections);
  });

  it('fills missing song info with empty values', () => {
    const parsed = JSON.parse(serializeGflow({
      title: 'x', sections: [section('a', 'A')], customChords: [], voicingPlan: {}, transposeOffset: 0, bpm: null, form: [],
    }));
    expect(parsed).toMatchObject({ artist: '', originalKey: '', tags: [], bpm: null, form: [] });
  });
});

describe('gflowFileName', () => {
  it('replaces whitespace and falls back for an empty title', () => {
    expect(gflowFileName(' My  Song ')).toBe('My_Song.gflow');
    expect(gflowFileName('  ')).toBe('song.gflow');
  });
});
