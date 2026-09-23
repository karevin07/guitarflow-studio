import { describe, expect, it } from 'vitest';
import { getScalePitchClasses } from '../music-theory';
import { POSITION_WINDOWS, notesInWindow, pentatonicBoxes } from './positions';

describe('pentatonic boxes', () => {
  const boxes = pentatonicBoxes(9, 'minorPentatonic');

  it('starts A minor box 1 at the fifth fret', () => {
    expect(boxes).toHaveLength(5);
    expect(boxes[0]).toMatchObject({ box: 1, from: 5, to: 8 });
    expect(boxes[0].notes.filter(note => note.stringIndex === 5).map(note => note.fret)).toEqual([5, 8]);
  });

  it('places two scale notes on every string', () => {
    const scale = new Set(getScalePitchClasses(9, 'minorPentatonic'));
    boxes.forEach(box => {
      expect(box.notes).toHaveLength(12);
      for (let stringIndex = 0; stringIndex < 6; stringIndex += 1) {
        expect(box.notes.filter(note => note.stringIndex === stringIndex)).toHaveLength(2);
      }
      box.notes.forEach(note => expect(scale.has(note.pitch)).toBe(true));
      expect(box.to - box.from).toBeLessThanOrEqual(4);
    });
  });

  it('never returns negative frets', () => {
    pentatonicBoxes(4, 'minorPentatonic').forEach(box => expect(box.from).toBeGreaterThanOrEqual(0));
  });
});

describe('notesInWindow', () => {
  it('only returns scale notes inside the window', () => {
    const middle = POSITION_WINDOWS.find(window => window.id === 'middle')!;
    const pitches = new Set(getScalePitchClasses(0, 'majorPentatonic'));
    const notes = notesInWindow(pitches, middle.from, middle.to);
    expect(notes.length).toBeGreaterThan(0);
    notes.forEach(note => {
      expect(pitches.has(note.pitch)).toBe(true);
      expect(note.fret).toBeGreaterThanOrEqual(5);
      expect(note.fret).toBeLessThanOrEqual(9);
    });
    expect(notes).toContainEqual({ stringIndex: 5, fret: 5, pitch: 9 });
  });
});
