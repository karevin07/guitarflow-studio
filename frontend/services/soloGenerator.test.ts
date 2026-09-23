import { describe, expect, it } from 'vitest';
import { analyzeChordForSolo, getScalePitchClasses, parseChord } from '../music-theory';
import { TabSection } from '../types';
import { SoloDensity, SoloGenerateOptions, SoloNote, SoloTechnique, generateSolo, lyricBusyColumns, phraseToMeasures } from './soloGenerator';
import { parseTabCellPitches } from './tabNotation';

const C_MAJOR = { tonic: 0, mode: 'major' } as const;
const row = (cells: Record<number, string>) => Array.from({ length: 16 }, (_, index) => cells[index] ?? null);
const emptyMeasure = () => Array.from({ length: 6 }, () => Array(16).fill('-'));

// 我喜歡你 Verse: |C G|Am Em|F C|Dm7 G|
const VERSE: TabSection = {
  id: 'verse',
  title: 'Verse',
  capo: 2,
  measures: Array.from({ length: 4 }, emptyMeasure),
  chords: [row({ 0: 'C', 8: 'G' }), row({ 0: 'Am', 8: 'Em' }), row({ 0: 'F', 8: 'C' }), row({ 0: 'Dm7', 8: 'G' })],
  lyrics: [row({ 0: '喔愛', 8: '什麼是愛' }), row({ 0: '你看我的眼神' }), row({}), row({})],
};
const SEGMENT_CHORDS = ['C', 'G', 'Am', 'Em', 'F', 'C', 'Dm7', 'G'];

const options = (overrides: Partial<SoloGenerateOptions> = {}): SoloGenerateOptions => ({
  section: VERSE,
  transposeOffset: 0,
  key: C_MAJOR,
  technique: 'pentatonic',
  density: 'medium',
  range: { from: 5, to: 9 },
  fillLyricGaps: false,
  useTechniques: false,
  seed: 1,
  ...overrides,
});

const TECHNIQUES: SoloTechnique[] = ['guideTone', 'arpeggio', 'pentatonic', 'doubleStop'];
const DENSITIES: SoloDensity[] = ['sparse', 'medium', 'dense'];
const absoluteCol = (note: SoloNote) => note.measureIdx * 16 + note.col;
const chordTones = (symbol: string) => {
  const { roles } = analyzeChordForSolo(parseChord(symbol)!, C_MAJOR);
  return new Set(roles.flatMap((role, pitch) => ['root', 'third', 'fifth', 'seventh'].includes(role) ? [pitch] : []));
};

describe('generateSolo', () => {
  it.each(TECHNIQUES.flatMap(technique => DENSITIES.map(density => [technique, density] as const)))(
    '%s / %s stays on the grid and inside the range',
    (technique, density) => {
      const phrase = generateSolo(options({ technique, density }));
      expect(phrase.notes.length).toBeGreaterThan(0);
      expect(phrase.warnings).toEqual([]);
      phrase.notes.forEach(note => {
        expect(note.col).toBeGreaterThanOrEqual(0);
        expect(note.col).toBeLessThan(16);
        expect(note.measureIdx).toBeLessThan(4);
        expect(note.fret).toBeGreaterThanOrEqual(4);
        expect(note.fret).toBeLessThanOrEqual(9);
        expect(note.durationCols).toBeGreaterThan(0);
      });
    }
  );

  it.each(TECHNIQUES)('%s lands on a chord tone when each chord arrives', technique => {
    const phrase = generateSolo(options({ technique }));
    SEGMENT_CHORDS.forEach((symbol, index) => {
      const first = phrase.notes.filter(note => absoluteCol(note) >= index * 8 && absoluteCol(note) < index * 8 + 8)[0];
      expect(first, `${symbol} segment`).toBeDefined();
      expect(chordTones(symbol).has(first.pitch), `${symbol} gets ${first.pitch}`).toBe(true);
    });
  });

  it('plays only guide tones (plus approach notes) for a sparse guide-tone line', () => {
    const phrase = generateSolo(options({ technique: 'guideTone', density: 'sparse' }));
    expect(phrase.notes).toHaveLength(8);
    phrase.notes.forEach((note, index) => {
      const { targets } = analyzeChordForSolo(parseChord(SEGMENT_CHORDS[index])!, C_MAJOR);
      expect(targets).toContain(note.pitch);
    });
  });

  it('adds half-step approach notes at medium density', () => {
    const phrase = generateSolo(options({ technique: 'guideTone', density: 'medium' }));
    expect(phrase.notes.length).toBeGreaterThan(8);
  });

  it('is deterministic per seed and varies across seeds', () => {
    expect(generateSolo(options({ seed: 7 }))).toEqual(generateSolo(options({ seed: 7 })));
    const variants = new Set([1, 2, 3, 4, 5].map(seed => JSON.stringify(generateSolo(options({ seed })).measures)));
    expect(variants.size).toBeGreaterThan(1);
  });

  it('keeps pentatonic notes in the key pentatonic scale', () => {
    const scale = new Set(getScalePitchClasses(0, 'majorPentatonic'));
    generateSolo(options({ density: 'dense' })).notes.forEach(note => expect(scale.has(note.pitch)).toBe(true));
  });

  it('only writes technique notation when enabled, and it parses', () => {
    generateSolo(options({ useTechniques: false, density: 'dense' })).notes
      .forEach(note => expect(note.cell).toMatch(/^\d+$/));
    const cells = [1, 2, 3, 4, 5, 6].flatMap(seed =>
      generateSolo(options({ useTechniques: true, density: 'dense', seed })).notes.map(note => note.cell));
    const techniques = cells.filter(cell => /[hpb]/.test(cell));
    expect(techniques.length).toBeGreaterThan(0);
    techniques.forEach(cell => expect(parseTabCellPitches(cell)).toHaveLength(2));
  });

  it('builds double stops from scale thirds or sixths on nearby strings', () => {
    const phrase = generateSolo(options({ technique: 'doubleStop' }));
    const scale = new Set(getScalePitchClasses(0, 'major'));
    const byOnset = new Map<string, SoloNote[]>();
    phrase.notes.forEach(note => {
      const key = `${note.measureIdx}:${note.col}`;
      byOnset.set(key, [...(byOnset.get(key) ?? []), note]);
    });
    expect(byOnset.size).toBeGreaterThan(0);
    byOnset.forEach(pair => {
      expect(pair).toHaveLength(2);
      const gap = Math.abs(pair[0].stringIndex - pair[1].stringIndex);
      expect([1, 2]).toContain(gap);
      pair.forEach(note => expect(scale.has(note.pitch)).toBe(true));
    });
  });

  it('leaves the vocal alone when filling lyric gaps', () => {
    const busy = lyricBusyColumns(VERSE);
    expect(busy[0]).toBe(true);
    expect(busy[15]).toBe(false);
    TECHNIQUES.forEach(technique => {
      const phrase = generateSolo(options({ technique, fillLyricGaps: true }));
      expect(phrase.notes.length).toBeGreaterThan(0);
      phrase.notes.forEach(note => {
        for (let col = absoluteCol(note); col < absoluteCol(note) + note.durationCols; col += 1) {
          expect(busy[col], `${technique} note at ${col}`).toBe(false);
        }
      });
    });
  });

  it('widens the range and warns when a pitch does not fit', () => {
    const phrase = generateSolo(options({ technique: 'guideTone', density: 'sparse', range: { from: 0, to: 0 } }));
    expect(phrase.notes).toHaveLength(8);
    expect(phrase.warnings.length).toBeGreaterThan(0);
  });

  it('explains an empty result', () => {
    const noChords = { ...VERSE, chords: VERSE.chords.map(() => row({})) };
    expect(generateSolo(options({ section: noChords })).warnings).toEqual(['這個段落沒有可以分析的和弦']);
  });
});

describe('phraseToMeasures', () => {
  it('writes cells into a measures grid', () => {
    const measures = phraseToMeasures([
      { measureIdx: 1, col: 4, stringIndex: 1, fret: 5, durationCols: 2, cell: '5h7', pitch: 4 },
    ], 2);
    expect(measures).toHaveLength(2);
    expect(measures[0]).toHaveLength(6);
    expect(measures[0][0]).toHaveLength(16);
    expect(measures[1][1][4]).toBe('5h7');
    expect(measures[0].flat().every(cell => cell === '-')).toBe(true);
  });
});
