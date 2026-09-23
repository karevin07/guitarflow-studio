import { PitchClass, ScaleType, getScalePitchClasses, toPitchClass } from '../music-theory';
import { noteAt } from './fretboard';
import { GuitarTuning, STANDARD_TUNING } from './tuning';

export type PositionWindowId = 'open' | 'middle' | 'high' | 'upper';

export interface PositionWindow {
  id: PositionWindowId;
  label: string;
  from: number;
  to: number;
}

/** Fret ranges relative to the capo, matching the low/middle/high split used for chord voicings. */
export const POSITION_WINDOWS: readonly PositionWindow[] = [
  { id: 'open', label: '低把位（開放）', from: 0, to: 4 },
  { id: 'middle', label: '中把位', from: 5, to: 9 },
  { id: 'high', label: '高把位', from: 8, to: 12 },
  { id: 'upper', label: '12 格以上', from: 12, to: 15 },
];

export interface FretPosition {
  /** App string order: 0 is high e, 5 is low E. */
  stringIndex: number;
  fret: number;
  pitch: PitchClass;
}

export const notesInWindow = (
  pitches: ReadonlySet<PitchClass>,
  from: number,
  to: number,
  tuning: GuitarTuning = STANDARD_TUNING
): FretPosition[] => tuning.strings.flatMap((openString, stringIndex) => {
  const positions: FretPosition[] = [];
  for (let fret = Math.max(0, from); fret <= to; fret += 1) {
    const pitch = noteAt(openString, fret);
    if (pitches.has(pitch)) positions.push({ stringIndex, fret, pitch });
  }
  return positions;
});

export interface PentatonicBox {
  /** 1-based; box 1 starts on the scale root on the low E string. */
  box: number;
  from: number;
  to: number;
  notes: FretPosition[];
}

// Standard tuning as MIDI numbers, low E to high e.
const OPEN_MIDI_LOW_TO_HIGH = [40, 45, 50, 55, 59, 64];

/**
 * The five two-notes-per-string pentatonic shapes in standard tuning.
 * Each box walks the scale upward from one scale note on the low E string.
 */
export const pentatonicBoxes = (
  root: PitchClass,
  type: Extract<ScaleType, 'majorPentatonic' | 'minorPentatonic'>
): PentatonicBox[] => {
  const scale = getScalePitchClasses(root, type);
  const inScale = new Set(scale);
  const lowE = STANDARD_TUNING.strings[5];

  return scale.map((startPitch, index) => {
    const startFret = toPitchClass(startPitch - lowE);
    const ascending: number[] = [];
    for (let midi = OPEN_MIDI_LOW_TO_HIGH[0] + startFret; ascending.length < 12; midi += 1) {
      if (inScale.has(toPitchClass(midi))) ascending.push(midi);
    }
    let frets = ascending.map((midi, noteIndex) => midi - OPEN_MIDI_LOW_TO_HIGH[Math.floor(noteIndex / 2)]);
    if (frets.some(fret => fret < 0)) frets = frets.map(fret => fret + 12);

    const notes = frets.map((fret, noteIndex) => ({
      stringIndex: 5 - Math.floor(noteIndex / 2),
      fret,
      pitch: toPitchClass(ascending[noteIndex]),
    }));
    return { box: index + 1, from: Math.min(...frets), to: Math.max(...frets), notes };
  });
};
