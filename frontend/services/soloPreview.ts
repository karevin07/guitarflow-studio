import { transposeChordSymbol } from '../music-theory';
import { ChordDefinition, SongVoicingPlan, TabSection } from '../types';
import { getAudioContext, pluck, voicingToMidiNotes } from './chordPreview';
import { SoloNote } from './soloGenerator';
import { parseTabCellPitches } from './tabNotation';
import { resolvePlannedVoicing } from './voicingPlan';

const COLS_PER_MEASURE = 16;

export interface PreviewEvent {
  /** Seconds from the start of the preview. */
  time: number;
  midi: number;
  volume: number;
  length: number;
}

export interface SoloPreviewInput {
  notes: SoloNote[];
  section: TabSection;
  chordLibrary: ChordDefinition[];
  voicingPlan: SongVoicingPlan;
  transposeOffset: number;
  bpm: number;
}

export const secondsPerColumn = (bpm: number) => 60 / bpm / 4;

/**
 * Solo notes over a light chord backing. Tab frets follow the song's source key, so like the
 * practice player they sound at fret + capo + transpose, while chord voicings are already transposed.
 */
export const buildPreviewEvents = ({ notes, section, chordLibrary, voicingPlan, transposeOffset, bpm }: SoloPreviewInput): PreviewEvent[] => {
  const perCol = secondsPerColumn(bpm);
  const capo = section.capo ?? 0;
  const events: PreviewEvent[] = [];

  const chordCols: Array<{ col: number; symbol: string }> = [];
  section.chords.forEach((row, measureIdx) => row.forEach((symbol, col) => {
    if (symbol) chordCols.push({ col: measureIdx * COLS_PER_MEASURE + col, symbol });
  }));
  const total = section.measures.length * COLS_PER_MEASURE;
  chordCols.forEach(({ col, symbol }, index) => {
    const effective = transposeChordSymbol(symbol, transposeOffset) ?? symbol;
    const voicing = resolvePlannedVoicing(symbol, effective, voicingPlan, chordLibrary);
    if (!voicing) return;
    const length = Math.min(2.5, ((chordCols[index + 1]?.col ?? total) - col) * perCol);
    voicingToMidiNotes(voicing.frets, capo).forEach(({ stringIndex, midi }) => {
      events.push({ time: col * perCol + (5 - stringIndex) * 0.02, midi, volume: 0.32, length });
    });
  });

  notes.forEach(note => {
    const start = (note.measureIdx * COLS_PER_MEASURE + note.col) * perCol;
    const length = Math.max(0.2, note.durationCols * perCol);
    const toMidi = (fret: number) => voicingToMidiNotes(
      Array.from({ length: 6 }, (_, index) => (index === note.stringIndex ? fret : null)), capo, transposeOffset
    )[0].midi;
    const frets = parseTabCellPitches(note.cell);
    if (frets.length === 2) {
      const delay = /b/i.test(note.cell) ? 0.15 : 0.1;
      events.push({ time: start, midi: toMidi(frets[0]), volume: 0.85, length: delay + 0.05 });
      events.push({ time: start + delay, midi: toMidi(frets[1]), volume: 0.85, length: Math.max(0.2, length - delay) });
    } else if (frets.length === 1) {
      events.push({ time: start, midi: toMidi(frets[0]), volume: 0.85, length });
    }
  });

  return events.sort((a, b) => a.time - b.time);
};

export interface SoloPreviewHandle {
  stop: () => void;
}

/** Play the preview; `onColumn` reports the absolute column (or null when finished). */
export const playSoloPreview = async (
  input: SoloPreviewInput,
  onColumn: (col: number | null) => void,
): Promise<SoloPreviewHandle> => {
  const context = await getAudioContext();
  const master = context.createGain();
  master.connect(context.destination);
  const lead = 0.08;
  const start = context.currentTime + lead;
  buildPreviewEvents(input).forEach(event => pluck(context, master, event.midi, start + event.time, event.volume, event.length));

  const perCol = secondsPerColumn(input.bpm);
  const total = input.section.measures.length * COLS_PER_MEASURE;
  let stopped = false;
  let lastCol = -1;
  const tick = () => {
    if (stopped) return;
    const col = Math.floor((context.currentTime - start) / perCol);
    if (col >= total) {
      stop();
      return;
    }
    if (col !== lastCol && col >= 0) {
      lastCol = col;
      onColumn(col);
    }
    timer = window.setTimeout(tick, Math.max(10, perCol * 250));
  };
  let timer = window.setTimeout(tick, lead * 1000);

  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearTimeout(timer);
    master.gain.setTargetAtTime(0, context.currentTime, 0.03);
    window.setTimeout(() => master.disconnect(), 300);
    onColumn(null);
  };
  return { stop };
};
