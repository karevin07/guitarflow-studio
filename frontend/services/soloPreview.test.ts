import { describe, expect, it } from 'vitest';
import { TabSection } from '../types';
import { buildPreviewEvents, secondsPerColumn } from './soloPreview';

const row = (cells: Record<number, string>) => Array.from({ length: 16 }, (_, index) => cells[index] ?? null);
const section: TabSection = {
  id: 's', title: 'Verse', capo: 2,
  measures: [Array.from({ length: 6 }, () => Array(16).fill('-'))],
  chords: [row({ 0: 'C', 8: 'G' })],
  lyrics: [row({})],
};
const chordLibrary = [
  { name: 'C', frets: [0, 1, 0, 2, 3, null] },
  { name: 'G', frets: [3, 0, 0, 0, 2, 3] },
];

describe('buildPreviewEvents', () => {
  const base = { section, chordLibrary, voicingPlan: {}, transposeOffset: 0, bpm: 60 };

  it('schedules solo notes on the column grid with the capo applied', () => {
    const events = buildPreviewEvents({ ...base, notes: [
      { measureIdx: 0, col: 4, stringIndex: 1, fret: 1, durationCols: 4, cell: '1', pitch: 0 },
    ] });
    const lead = events.filter(event => event.volume > 0.5);
    expect(lead).toEqual([{ time: 4 * secondsPerColumn(60), midi: 59 + 1 + 2, volume: 0.85, length: 1 }]);
  });

  it('splits technique cells into two notes', () => {
    const events = buildPreviewEvents({ ...base, notes: [
      { measureIdx: 0, col: 0, stringIndex: 0, fret: 5, durationCols: 4, cell: '5h7', pitch: 9 },
    ] }).filter(event => event.volume > 0.5);
    expect(events.map(event => event.midi)).toEqual([64 + 5 + 2, 64 + 7 + 2]);
    expect(events[1].time).toBeCloseTo(0.1);
  });

  it('strums chords at their columns and transposes solo notes like the practice player', () => {
    const events = buildPreviewEvents({ ...base, transposeOffset: 2, notes: [
      { measureIdx: 0, col: 0, stringIndex: 0, fret: 0, durationCols: 2, cell: '0', pitch: 4 },
    ] });
    expect(events.filter(event => event.volume > 0.5)[0].midi).toBe(64 + 2 + 2);
    const chordTimes = new Set(events.filter(event => event.volume < 0.5).map(event => Math.round(event.time)));
    expect(chordTimes).toEqual(new Set([0, 2]));
  });
});
