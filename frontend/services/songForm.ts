import { TabSection } from '../types';
import { PlaybackPosition } from '../types/playback';

/**
 * A song's play order ("form"): sections are written once and listed here in the order they are
 * played, each with a repeat count. An empty form plays the sections as written.
 * The server stores section positions; the editor keeps section ids so reordering is safe.
 */
export interface StoredFormEntry {
  section: number;
  repeat: number;
}

export interface SongFormEntry {
  sectionId: string;
  repeat: number;
}

export const MAX_REPEAT = 8;
const COLS = 16;

const clampRepeat = (repeat: unknown) =>
  typeof repeat === 'number' && Number.isFinite(repeat) ? Math.max(1, Math.min(MAX_REPEAT, Math.round(repeat))) : 1;

export const formFromStored = (stored: unknown, sections: TabSection[]): SongFormEntry[] => {
  if (!Array.isArray(stored)) return [];
  return stored.flatMap(entry => {
    const index = (entry as StoredFormEntry | null)?.section;
    const section = typeof index === 'number' ? sections[index] : undefined;
    return section ? [{ sectionId: section.id, repeat: clampRepeat((entry as StoredFormEntry).repeat) }] : [];
  });
};

export const formToStored = (form: SongFormEntry[], sections: TabSection[]): StoredFormEntry[] =>
  form.flatMap(entry => {
    const index = sections.findIndex(section => section.id === entry.sectionId);
    return index >= 0 ? [{ section: index, repeat: clampRepeat(entry.repeat) }] : [];
  });

/** Entries whose section still exists, as section indices (not expanded). */
export const formSteps = (form: SongFormEntry[], sections: TabSection[]): Array<{ sectionIdx: number; repeat: number }> =>
  formToStored(form, sections).map(entry => ({ sectionIdx: entry.section, repeat: entry.repeat }));

/** Section indices in play order with repeats expanded; the written order when there is no form. */
export const playOrder = (form: SongFormEntry[], sections: TabSection[]): number[] => {
  const order = formSteps(form, sections).flatMap(entry => Array<number>(entry.repeat).fill(entry.sectionIdx));
  return order.length > 0 ? order : sections.map((_, index) => index);
};

/** The form as a short line, e.g. "前奏 → 主歌 → 副歌 ×2". */
export const formLabel = (form: SongFormEntry[], sections: TabSection[]): string =>
  formSteps(form, sections).map(entry => `${sections[entry.sectionIdx].title}${entry.repeat > 1 ? ` ×${entry.repeat}` : ''}`).join(' → ');

export interface Timeline {
  /** Section index for each step of the play order. */
  order: number[];
  /** First playback column of each step. */
  starts: number[];
  total: number;
}

export const buildTimeline = (order: number[], sections: TabSection[]): Timeline => {
  const starts: number[] = [];
  let total = 0;
  order.forEach(sectionIdx => {
    starts.push(total);
    total += (sections[sectionIdx]?.measures.length ?? 0) * COLS;
  });
  return { order, starts, total };
};

/**
 * The step a position belongs to: its own step when given and valid, otherwise the first time
 * that section is played (at or after `fromStep` when possible).
 */
export const stepFor = (timeline: Timeline, position: PlaybackPosition, fromStep = 0): number => {
  if (position.step !== undefined && timeline.order[position.step] === position.sectionIdx) return position.step;
  const after = timeline.order.findIndex((sectionIdx, step) => step >= fromStep && sectionIdx === position.sectionIdx);
  if (after >= 0) return after;
  return timeline.order.indexOf(position.sectionIdx);
};

export const timelineIndex = (timeline: Timeline, position: PlaybackPosition, fromStep = 0): number => {
  const step = stepFor(timeline, position, fromStep);
  if (step < 0 || timeline.total === 0) return 0;
  const index = timeline.starts[step] + position.measureIdx * COLS + position.colIdx;
  return Math.max(0, Math.min(timeline.total - 1, index));
};

export const timelinePosition = (timeline: Timeline, index: number): PlaybackPosition => {
  if (timeline.total === 0) return { sectionIdx: 0, measureIdx: 0, colIdx: 0, step: 0 };
  const clamped = Math.max(0, Math.min(timeline.total - 1, index));
  let step = 0;
  while (step + 1 < timeline.starts.length && timeline.starts[step + 1] <= clamped) step += 1;
  const offset = clamped - timeline.starts[step];
  return { sectionIdx: timeline.order[step], measureIdx: Math.floor(offset / COLS), colIdx: offset % COLS, step };
};

/** Column range of one step, for looping it. */
export const stepRange = (timeline: Timeline, step: number): { start: number; end: number } | null => {
  if (step < 0 || step >= timeline.order.length) return null;
  const end = (timeline.starts[step + 1] ?? timeline.total) - 1;
  return end >= timeline.starts[step] ? { start: timeline.starts[step], end } : null;
};
