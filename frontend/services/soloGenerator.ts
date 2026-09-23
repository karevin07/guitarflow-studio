import {
  ChordSoloAnalysis,
  MusicalKey,
  PitchClass,
  analyzeChordForSolo,
  formatPitch,
  getScalePitchClasses,
  keyAccidentalPreference,
  keySafeScales,
  parseChord,
  toPitchClass,
} from '../music-theory';
import { TabSection } from '../types';
import { sectionChordSteps } from './progression';

export type SoloTechnique = 'guideTone' | 'arpeggio' | 'pentatonic' | 'doubleStop';
export type SoloDensity = 'sparse' | 'medium' | 'dense';

export interface FretRange {
  from: number;
  to: number;
}

export interface SoloGenerateOptions {
  section: TabSection;
  transposeOffset: number;
  key: MusicalKey;
  technique: SoloTechnique;
  density: SoloDensity;
  /** Fret range relative to the capo. */
  range: FretRange;
  /** Leave room for the vocal: only play where no lyric is being sung. */
  fillLyricGaps: boolean;
  /** Allow hammer-on, pull-off and bend notation (pentatonic phrases only). */
  useTechniques: boolean;
  seed: number;
}

export interface SoloNote {
  measureIdx: number;
  col: number;
  /** App string order: 0 is high e, 5 is low E. */
  stringIndex: number;
  fret: number;
  durationCols: number;
  /** Tab cell text: '7', '5h7', '7p5' or '5b7'. */
  cell: string;
  /** Pitch class of the first sounded note. */
  pitch: PitchClass;
}

export interface SoloPhrase {
  notes: SoloNote[];
  measures: string[][][];
  warnings: string[];
}

const COLS_PER_MEASURE = 16;
// Standard tuning, app string order (high e first).
const OPEN_MIDI = [64, 59, 55, 50, 45, 40];
const MAX_FRET = 22;

interface Position {
  stringIndex: number;
  fret: number;
  midi: number;
}

interface Segment {
  start: number;
  end: number;
  analysis: ChordSoloAnalysis;
}

/** Small deterministic PRNG so the same seed always gives the same phrase. */
export const mulberry32 = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type Random = ReturnType<typeof mulberry32>;

const pick = <T,>(random: Random, items: readonly T[]): T => items[Math.floor(random() * items.length)];

const buildSegments = (section: TabSection, transposeOffset: number, key: MusicalKey): Segment[] => {
  const total = section.measures.length * COLS_PER_MEASURE;
  const steps = sectionChordSteps(section, transposeOffset);
  const segments: Segment[] = [];
  let previous: ChordSoloAnalysis | null = null;
  steps.forEach((step, index) => {
    const chord = parseChord(step.effectiveSymbol);
    const analysis = chord ? analyzeChordForSolo(chord, key) : previous;
    previous = analysis;
    if (!analysis) return;
    const next = steps[index + 1];
    segments.push({
      start: step.measureIdx * COLS_PER_MEASURE + step.colIdx,
      end: next ? next.measureIdx * COLS_PER_MEASURE + next.colIdx : total,
      analysis,
    });
  });
  return segments.filter(segment => segment.end > segment.start);
};

const LYRIC_COLS_PER_CHAR = 1.5;

/** Columns where the vocal is probably singing, estimated from lyric length. */
export const lyricBusyColumns = (section: TabSection): boolean[] => {
  const total = section.measures.length * COLS_PER_MEASURE;
  const busy = Array<boolean>(total).fill(false);
  const starts: Array<{ col: number; length: number }> = [];
  section.lyrics.forEach((row, measureIdx) => row?.forEach((text, col) => {
    const syllables = (text ?? '').replace(/[\s,.!?，。！？、()（）]/g, '').length;
    if (syllables > 0) starts.push({ col: measureIdx * COLS_PER_MEASURE + col, length: syllables });
  }));
  starts.forEach((lyric, index) => {
    const limit = starts[index + 1]?.col ?? total;
    const end = Math.min(limit, lyric.col + Math.ceil(lyric.length * LYRIC_COLS_PER_CHAR));
    for (let col = lyric.col; col < end; col += 1) busy[col] = true;
  });
  return busy;
};

// Rhythm cells fill one beat (4 columns of sixteenths).
const BEAT_CELLS: Record<SoloDensity, number[][]> = {
  sparse: [[4]],
  medium: [[4], [2, 2], [2, 2], [4]],
  dense: [[2, 2], [1, 1, 2], [2, 1, 1], [1, 1, 1, 1]],
};

interface Onset {
  col: number;
  duration: number;
}

const rhythmFor = (segment: Segment, density: SoloDensity, random: Random): Onset[] => {
  const onsets: Onset[] = [];
  let col = segment.start;
  while (col < segment.end) {
    const remaining = segment.end - col;
    if (density === 'sparse' && remaining >= 8 && random() < 0.5) {
      onsets.push({ col, duration: 8 });
      col += 8;
      continue;
    }
    const beat = Math.min(4, remaining);
    const cell = beat === 4 ? pick(random, BEAT_CELLS[density]) : [beat];
    cell.forEach(duration => {
      onsets.push({ col, duration });
      col += duration;
    });
  }
  return onsets;
};

/** Drop onsets over the vocal and shorten notes that would ring into it. */
const avoidBusy = (onsets: Onset[], busy: boolean[] | null): Onset[] => {
  if (!busy) return onsets;
  return onsets.flatMap(onset => {
    if (busy[onset.col]) return [];
    let duration = 1;
    while (duration < onset.duration && !busy[onset.col + duration]) duration += 1;
    return [{ col: onset.col, duration }];
  });
};

const positionsForPitches = (pitches: ReadonlySet<PitchClass>, range: FretRange): Position[] =>
  OPEN_MIDI.flatMap((open, stringIndex) => {
    const positions: Position[] = [];
    for (let fret = Math.max(0, range.from); fret <= Math.min(MAX_FRET, range.to); fret += 1) {
      if (pitches.has(toPitchClass(open + fret))) positions.push({ stringIndex, fret, midi: open + fret });
    }
    return positions;
  });

const movementCost = (position: Position, previous: Position | null, range: FretRange): number => {
  // Treble strings carry a melody best; the middle of the range is a comfortable start.
  const stringBias = position.stringIndex * 0.4;
  if (!previous) return Math.abs(position.fret - (range.from + range.to) / 2) * 0.5 + stringBias;
  return Math.abs(position.midi - previous.midi) * 1.2
    + Math.abs(position.fret - previous.fret) * 0.6
    + Math.abs(position.stringIndex - previous.stringIndex) * 0.8
    + stringBias * 0.25;
};

class PositionFinder {
  readonly warnings = new Set<string>();

  constructor(readonly range: FretRange, private readonly key: MusicalKey) {}

  /** Candidate positions, widening the range by two frets at a time when nothing fits. */
  candidates(pitches: ReadonlySet<PitchClass>): Position[] {
    for (let widen = 0; widen <= 6; widen += 2) {
      const range = { from: Math.max(0, this.range.from - widen), to: this.range.to + widen };
      const found = positionsForPitches(pitches, range);
      if (found.length > 0) {
        if (widen > 0) {
          const names = [...pitches].map(pitch => formatPitch(pitch, keyAccidentalPreference(this.key))).join('/');
          this.warnings.add(`${names} 不在 ${this.range.from}–${this.range.to} 格內，已放寬到 ${range.from}–${range.to} 格`);
        }
        return found;
      }
    }
    return [];
  }

  nearest(pitches: ReadonlySet<PitchClass>, previous: Position | null, filter?: (position: Position) => boolean): Position | null {
    const candidates = this.candidates(pitches).filter(position => !filter || filter(position));
    let best: Position | null = null;
    let bestCost = Infinity;
    candidates.forEach(position => {
      const cost = movementCost(position, previous, this.range);
      if (cost < bestCost) {
        best = position;
        bestCost = cost;
      }
    });
    return best;
  }
}

const chordTonesOf = (analysis: ChordSoloAnalysis): Set<PitchClass> => new Set(
  analysis.roles.flatMap((role, pitch) =>
    role === 'root' || role === 'third' || role === 'fifth' || role === 'seventh' ? [toPitchClass(pitch)] : [])
);

const isStrongBeat = (col: number) => col % 8 === 0;

interface Draft {
  col: number;
  duration: number;
  position: Position;
  /** Optional second string for double stops. */
  harmony?: Position;
  cell?: string;
}

const generateGuideTones = (
  segments: Segment[],
  options: SoloGenerateOptions,
  finder: PositionFinder,
  busy: boolean[] | null
): Draft[] => {
  const drafts: Draft[] = [];
  let previous: Position | null = null;
  segments.forEach(segment => {
    let start = segment.start;
    while (start < segment.end && busy?.[start]) start += 1;
    if (start >= segment.end) return;
    const onset = avoidBusy([{ col: start, duration: segment.end - start }], busy)[0];
    const position = finder.nearest(new Set(segment.analysis.targets), previous);
    if (!position) return;
    drafts.push({ col: onset.col, duration: onset.duration, position });
    previous = position;
  });

  if (options.density === 'sparse') return drafts;
  // Chromatic approach from a half step below into the next guide tone.
  return drafts.flatMap((draft, index) => {
    const next = drafts[index + 1];
    const approachCol = next ? next.col - 2 : -1;
    if (!next || draft.duration < 6 || approachCol <= draft.col || busy?.[approachCol] || busy?.[approachCol + 1]) return [draft];
    const approachPitch = toPitchClass(next.position.midi - 1);
    const approach = finder.nearest(new Set([approachPitch]), next.position, position => position.midi === next.position.midi - 1);
    if (!approach) return [draft];
    return [{ ...draft, duration: approachCol - draft.col }, { col: approachCol, duration: 2, position: approach }];
  });
};

const generateArpeggio = (
  segments: Segment[],
  options: SoloGenerateOptions,
  finder: PositionFinder,
  busy: boolean[] | null,
  random: Random
): Draft[] => {
  const drafts: Draft[] = [];
  let previous: Position | null = null;
  segments.forEach((segment, segmentIndex) => {
    const tones = chordTonesOf(segment.analysis);
    let direction = segmentIndex % 2 === 0 ? 1 : -1;
    const onsets = avoidBusy(rhythmFor(segment, options.density, random), busy);
    onsets.forEach((onset, index) => {
      let position: Position | null;
      if (index === 0 || !previous) {
        position = finder.nearest(tones, previous);
      } else {
        const from: Position = previous;
        const step = (dir: number) => finder.nearest(tones, from, candidate => (candidate.midi - from.midi) * dir > 0 && Math.abs(candidate.midi - from.midi) <= 9);
        position = step(direction);
        if (!position) {
          direction = -direction;
          position = step(direction);
        }
      }
      if (!position) return;
      drafts.push({ col: onset.col, duration: onset.duration, position });
      previous = position;
    });
  });
  return drafts;
};

/** Scale positions in range, one per pitch (the one nearest the middle of the range), low to high. */
const scaleLadder = (pitches: ReadonlySet<PitchClass>, finder: PositionFinder): Position[] => {
  const center = (finder.range.from + finder.range.to) / 2;
  const byMidi = new Map<number, Position>();
  finder.candidates(pitches).forEach(position => {
    const existing = byMidi.get(position.midi);
    if (!existing || Math.abs(position.fret - center) < Math.abs(existing.fret - center)) byMidi.set(position.midi, position);
  });
  return [...byMidi.values()].sort((a, b) => a.midi - b.midi);
};

const generatePentatonic = (
  segments: Segment[],
  options: SoloGenerateOptions,
  finder: PositionFinder,
  busy: boolean[] | null,
  random: Random
): Draft[] => {
  const scale = keySafeScales(options.key)[0];
  const pitches = new Set(getScalePitchClasses(scale.root, scale.type));
  const ladder = scaleLadder(pitches, finder);
  if (ladder.length === 0) return [];

  const drafts: Draft[] = [];
  let index = Math.floor(ladder.length / 2);
  let direction = random() < 0.5 ? 1 : -1;

  segments.forEach(segment => {
    const tones = chordTonesOf(segment.analysis);
    const onsets = avoidBusy(rhythmFor(segment, options.density, random), busy);
    onsets.forEach((onset, onsetIndex) => {
      if (onsetIndex === 0) {
        // Land on the nearest chord tone when the chord arrives.
        let best = -1;
        ladder.forEach((position, candidate) => {
          if (!tones.has(toPitchClass(position.midi))) return;
          if (best < 0 || Math.abs(candidate - index) < Math.abs(best - index)) best = candidate;
        });
        if (best >= 0) index = best;
      } else {
        if (random() < 0.3) direction = -direction;
        const leap = random() < 0.25 ? 2 : 1;
        let next = index + direction * leap;
        if (next < 0 || next >= ladder.length) {
          direction = -direction;
          next = index + direction * leap;
        }
        index = Math.max(0, Math.min(ladder.length - 1, next));
        // Avoid notes on strong beats (a half step above a chord tone).
        if (isStrongBeat(onset.col) && segment.analysis.roles[toPitchClass(ladder[index].midi)] === 'passing') {
          index = Math.max(0, Math.min(ladder.length - 1, index + direction));
        }
      }
      drafts.push({ col: onset.col, duration: onset.duration, position: ladder[index] });
    });
  });

  return options.useTechniques ? applyTechniques(drafts, segments, pitches, random) : drafts;
};

/** Turn same-string steps into hammer-ons / pull-offs and some phrase endings into bends. */
const applyTechniques = (
  drafts: Draft[],
  segments: Segment[],
  scale: ReadonlySet<PitchClass>,
  random: Random
): Draft[] => {
  const result: Draft[] = [];
  const segmentOf = (col: number) => segments.findIndex(segment => col >= segment.start && col < segment.end);
  for (let index = 0; index < drafts.length; index += 1) {
    const draft = drafts[index];
    const next = drafts[index + 1];
    const sameSegment = next && segmentOf(next.col) === segmentOf(draft.col);
    const gap = next ? next.position.fret - draft.position.fret : 0;
    if (sameSegment && next.position.stringIndex === draft.position.stringIndex && Math.abs(gap) >= 1 && Math.abs(gap) <= 3
      && next.col === draft.col + draft.duration && draft.position.fret > 0 && next.position.fret >= 0 && random() < 0.6) {
      const technique = gap > 0 ? 'h' : 'p';
      if (technique === 'p' && next.position.fret === 0 && draft.position.fret < 1) {
        result.push(draft);
        continue;
      }
      result.push({
        ...draft,
        duration: draft.duration + next.duration,
        cell: `${draft.position.fret}${technique}${next.position.fret}`,
      });
      index += 1;
      continue;
    }

    const isPhraseEnd = !next || segmentOf(next.col) !== segmentOf(draft.col);
    const bendFrom = draft.position.fret - 2;
    const isFirstOfSegment = segments.some(segment => segment.start === draft.col);
    if (isPhraseEnd && !isFirstOfSegment && draft.duration >= 4 && draft.position.stringIndex <= 2 && bendFrom >= 1
      && scale.has(toPitchClass(draft.position.midi - 2)) && random() < 0.5) {
      result.push({
        ...draft,
        position: { ...draft.position, fret: bendFrom, midi: draft.position.midi - 2 },
        cell: `${bendFrom}b${draft.position.fret}`,
      });
      continue;
    }
    result.push(draft);
  }
  return result;
};

const SCALE_STEPS_DOWN = { third: 2, sixth: 5 } as const;

const generateDoubleStops = (
  segments: Segment[],
  options: SoloGenerateOptions,
  finder: PositionFinder,
  busy: boolean[] | null,
  random: Random
): Draft[] => {
  const drafts: Draft[] = [];
  let previous: Position | null = null;
  segments.forEach(segment => {
    const scale = getScalePitchClasses(segment.analysis.scale.root, segment.analysis.scale.type);
    const tones = chordTonesOf(segment.analysis);
    const length = segment.end - segment.start;
    const hits = options.density === 'sparse' ? 1 : options.density === 'medium' ? 2 : Math.max(1, Math.floor(length / 4));
    const spacing = Math.max(1, Math.floor(length / hits));
    const onsets = avoidBusy(
      Array.from({ length: hits }, (_, hit) => ({
        col: segment.start + hit * spacing,
        duration: hit === hits - 1 ? length - hit * spacing : spacing,
      })).filter(onset => onset.duration > 0),
      busy
    );
    const interval = random() < 0.5 ? 'third' : 'sixth';
    onsets.forEach((onset, index) => {
      const topPitches = index === 0 ? new Set(segment.analysis.targets) : tones;
      const choose = (kind: keyof typeof SCALE_STEPS_DOWN) => {
        const stringGap = kind === 'third' ? 1 : 2;
        let best: Draft | null = null;
        let bestCost = Infinity;
        finder.candidates(topPitches).forEach(top => {
          const lowString = top.stringIndex + stringGap;
          if (lowString > 5 || top.stringIndex > 2) return;
          const degree = scale.indexOf(toPitchClass(top.midi));
          if (degree < 0) return;
          const lowPitch = scale[(degree - SCALE_STEPS_DOWN[kind] + 7 * 2) % 7];
          const semitones = toPitchClass(top.midi - lowPitch);
          const lowMidi = top.midi - semitones;
          const lowFret = lowMidi - OPEN_MIDI[lowString];
          if (lowFret < 0 || lowFret > MAX_FRET || Math.abs(lowFret - top.fret) > 3) return;
          const cost = movementCost(top, previous, options.range);
          if (cost < bestCost) {
            bestCost = cost;
            best = {
              col: onset.col,
              duration: onset.duration,
              position: top,
              harmony: { stringIndex: lowString, fret: lowFret, midi: lowMidi },
            };
          }
        });
        return best as Draft | null;
      };
      const draft = choose(interval) ?? choose(interval === 'third' ? 'sixth' : 'third');
      if (!draft) return;
      drafts.push(draft);
      previous = draft.position;
    });
  });
  return drafts;
};

const toNotes = (drafts: Draft[]): SoloNote[] => drafts.flatMap(draft => {
  const base = {
    measureIdx: Math.floor(draft.col / COLS_PER_MEASURE),
    col: draft.col % COLS_PER_MEASURE,
    durationCols: draft.duration,
  };
  const notes: SoloNote[] = [{
    ...base,
    stringIndex: draft.position.stringIndex,
    fret: draft.position.fret,
    cell: draft.cell ?? String(draft.position.fret),
    pitch: toPitchClass(draft.position.midi),
  }];
  if (draft.harmony) {
    notes.push({
      ...base,
      stringIndex: draft.harmony.stringIndex,
      fret: draft.harmony.fret,
      cell: String(draft.harmony.fret),
      pitch: toPitchClass(draft.harmony.midi),
    });
  }
  return notes;
}).sort((a, b) => a.measureIdx - b.measureIdx || a.col - b.col || a.stringIndex - b.stringIndex);

export const phraseToMeasures = (notes: SoloNote[], measureCount: number): string[][][] => {
  const measures = Array.from({ length: measureCount }, () =>
    Array.from({ length: 6 }, () => Array<string>(COLS_PER_MEASURE).fill('-')));
  notes.forEach(note => {
    if (note.measureIdx < measureCount) measures[note.measureIdx][note.stringIndex][note.col] = note.cell;
  });
  return measures;
};

export const generateSolo = (options: SoloGenerateOptions): SoloPhrase => {
  const random = mulberry32(options.seed);
  const segments = buildSegments(options.section, options.transposeOffset, options.key);
  const finder = new PositionFinder(options.range, options.key);
  const busy = options.fillLyricGaps ? lyricBusyColumns(options.section) : null;

  const drafts = options.technique === 'guideTone'
    ? generateGuideTones(segments, options, finder, busy)
    : options.technique === 'arpeggio'
      ? generateArpeggio(segments, options, finder, busy, random)
      : options.technique === 'pentatonic'
        ? generatePentatonic(segments, options, finder, busy, random)
        : generateDoubleStops(segments, options, finder, busy, random);

  const notes = toNotes(drafts);
  const warnings = [...finder.warnings];
  if (segments.length === 0) warnings.push('這個段落沒有可以分析的和弦');
  else if (notes.length === 0) warnings.push(busy ? '歌詞把整段都佔滿了，關掉「只在歌詞空白處填句」再試一次' : '這個把位找不到可用的音');
  return { notes, measures: phraseToMeasures(notes, options.section.measures.length), warnings };
};
