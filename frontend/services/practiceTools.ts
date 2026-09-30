import { MAX_BPM } from '../constants/practice';

export interface ColumnRange {
  /** First column of the range in whole-song playback order. */
  start: number;
  /** Last column of the range (inclusive). */
  end: number;
}

export const isRangeLooped = (
  abLoop: { enabled: boolean; start: number | null; end: number | null },
  range: ColumnRange | null
): boolean => Boolean(range && abLoop.enabled && abLoop.start === range.start && abLoop.end === range.end);

/** Clicks before playback: one per beat of the section's meter. */
export const countInBeats = (bars: number, timeSignature: [number, number] | undefined): number =>
  Math.max(0, Math.round(bars)) * (timeSignature?.[0] ?? 4);

export interface TempoTrainer {
  enabled: boolean;
  /** BPM added each time the loop starts over. */
  step: number;
  /** Speed-up stops here. */
  target: number;
}

export const DEFAULT_TEMPO_TRAINER: TempoTrainer = { enabled: false, step: 5, target: 120 };

/** Tempo for the next pass of a loop; never passes the target and never slows down. */
export const nextTrainedBpm = (bpm: number, trainer: TempoTrainer): number => {
  if (!trainer.enabled || bpm >= trainer.target) return bpm;
  return Math.min(trainer.target, MAX_BPM, bpm + Math.max(1, trainer.step));
};

const COUNT_IN_KEY = 'guitarflow-count-in-bars';
export const COUNT_IN_OPTIONS = [0, 1, 2] as const;

export const loadCountInBars = (): number => {
  try {
    const raw = localStorage.getItem(COUNT_IN_KEY);
    const stored = raw === null ? NaN : Number(raw);
    return (COUNT_IN_OPTIONS as readonly number[]).includes(stored) ? stored : 1;
  } catch {
    return 1;
  }
};

export const saveCountInBars = (bars: number): void => {
  try {
    localStorage.setItem(COUNT_IN_KEY, String(bars));
  } catch {
    // Keeps working for this visit.
  }
};
