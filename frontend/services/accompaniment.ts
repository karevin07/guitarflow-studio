import { TabSection } from '../types';

/**
 * Accompaniment rhythm notation, as written on Taiwanese chord sheets:
 * beats are separated by spaces and each beat's symbols split it evenly (so "↓↑" is two
 * eighths and "T12" a triplet).
 *   ↓ / D  strum down        ↑ / U  strum up        X  muted chuck        -  rest
 *   T      bass (thumb)      1 / 2 / 3  the 3rd, 2nd and 1st string (fingerpicking)
 */
export type StepAction = 'down' | 'up' | 'mute' | 'rest' | 'bass' | 'pluck';

export interface PatternStep {
  action: StepAction;
  /** App string index (0 = high e) for 'pluck'. */
  stringIndex?: number;
}

export interface RhythmPattern {
  beats: PatternStep[][];
}

export type PatternParseResult = { ok: true; pattern: RhythmPattern } | { ok: false; error: string };

// Taiwanese fingering numbers: 1 = G string, 2 = B string, 3 = high e.
const PLUCK_STRINGS: Record<string, number> = { '1': 2, '2': 1, '3': 0 };

const stepFor = (symbol: string): PatternStep | null => {
  if (symbol === '↓' || symbol === 'D' || symbol === 'd') return { action: 'down' };
  if (symbol === '↑' || symbol === 'U' || symbol === 'u') return { action: 'up' };
  if (symbol === 'X' || symbol === 'x') return { action: 'mute' };
  if (symbol === '-' || symbol === '.' || symbol === '_') return { action: 'rest' };
  if (symbol === 'T' || symbol === 't') return { action: 'bass' };
  if (symbol in PLUCK_STRINGS) return { action: 'pluck', stringIndex: PLUCK_STRINGS[symbol] };
  return null;
};

export const parsePattern = (text: string): PatternParseResult => {
  const beats = text.trim().split(/\s+/).filter(Boolean);
  if (beats.length === 0) return { ok: false, error: '請輸入節奏型' };
  if (beats.length > 12) return { ok: false, error: '一小節最多 12 拍' };
  const parsed: PatternStep[][] = [];
  for (const beat of beats) {
    const symbols = [...beat];
    if (symbols.length > 6) return { ok: false, error: `「${beat}」一拍最多分成 6 下` };
    const steps: PatternStep[] = [];
    for (const symbol of symbols) {
      const step = stepFor(symbol);
      if (!step) return { ok: false, error: `看不懂「${symbol}」，可以用 ↓ ↑ X - T 1 2 3` };
      steps.push(step);
    }
    parsed.push(steps);
  }
  return { ok: true, pattern: { beats: parsed } };
};

export interface PatternPreset {
  id: string;
  name: string;
  text: string;
  hint: string;
}

export const PATTERN_PRESETS: PatternPreset[] = [
  { id: 'folk', name: '民謠刷法', text: '↓ ↓↑ -↑ ↓↑', hint: '最常用的 4/4 流行刷法' },
  { id: 'slow', name: '慢四拍', text: '↓ ↓ ↓ ↓', hint: '每拍刷一下，適合慢歌或初學' },
  { id: 'eighths', name: '八分刷', text: '↓↑ ↓↑ ↓↑ ↓↑', hint: '平均的上下刷，比較有推進感' },
  { id: 'backbeat', name: '切音刷法', text: '↓ X ↓↑ X', hint: '第 2、4 拍切音，輕快的節奏' },
  { id: 'arpeggio', name: '分散和弦', text: 'T1 21 31 21', hint: '抒情歌常見的指法' },
  { id: 'slow-arpeggio', name: '慢板分解', text: 'T 1 2 3', hint: '每拍彈一個音，最簡單的指法' },
];

/** The steps for one beat of a bar; a short pattern repeats across longer bars. */
export const beatSteps = (pattern: RhythmPattern, beatIndex: number): PatternStep[] =>
  pattern.beats[beatIndex % pattern.beats.length] ?? [];

export interface AccompanimentNote {
  /** Seconds after the start of the beat. */
  offset: number;
  stringIndex: number;
  fret: number;
  volume: number;
  duration: number;
}

export interface ScheduledBeat {
  notes: AccompanimentNote[];
  /** Offsets of muted chucks. */
  mutes: number[];
}

const STRUM_GAP = 0.012;

/** Lowest sounding string of a chord shape: the bass the thumb plays. */
export const bassString = (frets: Array<number | null>): number | null => {
  for (let index = frets.length - 1; index >= 0; index -= 1) {
    if (frets[index] !== null) return index;
  }
  return null;
};

/** Turn one beat of the pattern into notes for a chord shape (frets ordered high e → low E). */
export const scheduleBeat = (steps: PatternStep[], frets: Array<number | null>, secondsPerBeat: number): ScheduledBeat => {
  const notes: AccompanimentNote[] = [];
  const mutes: number[] = [];
  const slot = secondsPerBeat / Math.max(1, steps.length);
  steps.forEach((step, index) => {
    const offset = index * slot;
    // Let each hit ring until the next sounding step (rests keep it ringing).
    let next = index + 1;
    while (next < steps.length && steps[next].action === 'rest') next += 1;
    const ring = Math.max(0.15, (next - index) * slot + 0.1);
    const add = (stringIndex: number, delay: number, volume: number) => {
      const fret = frets[stringIndex];
      if (fret === null || fret === undefined) return;
      notes.push({ offset: offset + delay, stringIndex, fret, volume, duration: ring });
    };
    switch (step.action) {
      case 'down': {
        let delay = 0;
        for (let stringIndex = frets.length - 1; stringIndex >= 0; stringIndex -= 1) {
          if (frets[stringIndex] === null) continue;
          add(stringIndex, delay, index === 0 ? 0.8 : 0.7);
          delay += STRUM_GAP;
        }
        break;
      }
      case 'up': {
        // Up strokes catch the treble strings and are lighter.
        let delay = 0;
        for (let stringIndex = 0; stringIndex <= 3; stringIndex += 1) {
          if (frets[stringIndex] === null) continue;
          add(stringIndex, delay, 0.5);
          delay += STRUM_GAP;
        }
        break;
      }
      case 'bass': {
        const bass = bassString(frets);
        if (bass !== null) add(bass, 0, 0.8);
        break;
      }
      case 'pluck':
        if (step.stringIndex !== undefined) add(step.stringIndex, 0, 0.65);
        break;
      case 'mute':
        mutes.push(offset);
        break;
      default:
        break;
    }
  });
  return { notes, mutes };
};

/** The chord sounding at a spot in a section: the latest chord at or before it. */
export const chordAtOrBefore = (section: TabSection, measureIdx: number, colIdx: number): string | null => {
  for (let measure = measureIdx; measure >= 0; measure -= 1) {
    const row = section.chords[measure] ?? [];
    const from = measure === measureIdx ? Math.min(colIdx, row.length - 1) : row.length - 1;
    for (let col = from; col >= 0; col -= 1) {
      if (row[col]) return row[col];
    }
  }
  return null;
};
