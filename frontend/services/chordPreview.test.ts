import { describe, expect, it } from 'vitest';
import { voicingToMidiNotes } from './chordPreview';

describe('voicingToMidiNotes', () => {
  it('converts app-order frets into guitar MIDI pitches', () => {
    expect(voicingToMidiNotes([0, 1, 0, 2, 3, null])).toEqual([
      { stringIndex: 0, midi: 64 },
      { stringIndex: 1, midi: 60 },
      { stringIndex: 2, midi: 55 },
      { stringIndex: 3, midi: 52 },
      { stringIndex: 4, midi: 48 },
    ]);
  });

  it('applies capo and transpose offsets', () => {
    expect(voicingToMidiNotes([0, null, null, null, null, null], 2, 1)).toEqual([
      { stringIndex: 0, midi: 67 },
    ]);
  });
});
