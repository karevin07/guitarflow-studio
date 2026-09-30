import { describe, expect, it } from 'vitest';
import { TabSection } from '../types';
import { PATTERN_PRESETS, bassString, beatSteps, chordAtOrBefore, parsePattern, scheduleBeat } from './accompaniment';

const C_SHAPE = [0, 1, 0, 2, 3, null];
const parse = (text: string) => {
  const result = parsePattern(text);
  if (!result.ok) throw new Error(result.error);
  return result.pattern;
};

describe('parsePattern', () => {
  it('parses every preset', () => {
    PATTERN_PRESETS.forEach(preset => expect(parsePattern(preset.text).ok, preset.name).toBe(true));
  });

  it('splits beats and subdivisions', () => {
    const pattern = parse('↓ ↓↑ -↑ ↓↑');
    expect(pattern.beats.map(beat => beat.map(step => step.action))).toEqual([
      ['down'], ['down', 'up'], ['rest', 'up'], ['down', 'up'],
    ]);
  });

  it('reads letters and fingering numbers', () => {
    expect(parse('D U x').beats.map(beat => beat[0].action)).toEqual(['down', 'up', 'mute']);
    expect(parse('T123').beats[0]).toEqual([
      { action: 'bass' }, { action: 'pluck', stringIndex: 2 }, { action: 'pluck', stringIndex: 1 }, { action: 'pluck', stringIndex: 0 },
    ]);
  });

  it('explains what it cannot read', () => {
    expect(parsePattern('↓ Q')).toEqual({ ok: false, error: '看不懂「Q」，可以用 ↓ ↑ X - T 1 2 3' });
    expect(parsePattern('   ').ok).toBe(false);
  });
});

describe('beatSteps', () => {
  it('repeats a short pattern across the bar', () => {
    const pattern = parse('↓ ↑');
    expect(beatSteps(pattern, 0)[0].action).toBe('down');
    expect(beatSteps(pattern, 3)[0].action).toBe('up');
  });
});

describe('scheduleBeat', () => {
  it('strums down from the lowest sounding string', () => {
    const { notes } = scheduleBeat(parse('↓').beats[0], C_SHAPE, 1);
    expect(notes.map(note => note.stringIndex)).toEqual([4, 3, 2, 1, 0]);
    expect(notes[1].offset).toBeCloseTo(0.012);
    expect(notes.every(note => note.fret === C_SHAPE[note.stringIndex])).toBe(true);
  });

  it('strums up across the treble strings, lighter', () => {
    const { notes } = scheduleBeat(parse('↑').beats[0], C_SHAPE, 1);
    expect(notes.map(note => note.stringIndex)).toEqual([0, 1, 2, 3]);
    expect(notes[0].volume).toBeLessThan(0.7);
  });

  it('places subdivisions evenly, triplets included', () => {
    const { notes } = scheduleBeat(parse('T12').beats[0], C_SHAPE, 0.6);
    expect(notes.map(note => [note.stringIndex, Number(note.offset.toFixed(2))])).toEqual([[4, 0], [2, 0.2], [1, 0.4]]);
  });

  it('plays the bass on the lowest sounding string and skips muted strings', () => {
    expect(bassString(C_SHAPE)).toBe(4);
    expect(bassString([3, 0, 0, 0, 2, 3])).toBe(5);
    const { notes } = scheduleBeat(parse('1').beats[0], [0, 1, null, 2, 3, null], 1);
    expect(notes).toEqual([]);
  });

  it('turns X into a muted chuck and lets rests ring', () => {
    const beat = scheduleBeat(parse('X↑').beats[0], C_SHAPE, 1);
    expect(beat.mutes).toEqual([0]);
    expect(beat.notes[0].offset).toBeCloseTo(0.5);
    const held = scheduleBeat(parse('↓-').beats[0], C_SHAPE, 1);
    expect(held.notes[0].duration).toBeCloseTo(1.1);
  });
});

describe('chordAtOrBefore', () => {
  const row = (cells: Record<number, string>) => Array.from({ length: 16 }, (_, index) => cells[index] ?? null);
  const section: TabSection = { id: 's', title: 'V', capo: 0, measures: [], chords: [row({ 0: 'C', 8: 'G' }), row({})], lyrics: [] };
  it('finds the latest chord, looking back across bars', () => {
    expect(chordAtOrBefore(section, 0, 4)).toBe('C');
    expect(chordAtOrBefore(section, 0, 12)).toBe('G');
    expect(chordAtOrBefore(section, 1, 0)).toBe('G');
  });
});
