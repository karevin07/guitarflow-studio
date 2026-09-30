import { beforeEach, describe, expect, it, vi } from 'vitest';
import { countInBeats, isRangeLooped, loadCountInBars, nextTrainedBpm, saveCountInBars } from './practiceTools';

describe('isRangeLooped', () => {
  it('knows when a section is the active loop', () => {
    const range = { start: 32, end: 79 };
    expect(isRangeLooped({ enabled: true, start: 32, end: 79 }, range)).toBe(true);
    expect(isRangeLooped({ enabled: false, start: 32, end: 79 }, range)).toBe(false);
    expect(isRangeLooped({ enabled: true, start: 0, end: 31 }, range)).toBe(false);
  });
});

describe('countInBeats', () => {
  it('clicks each beat of the meter', () => {
    expect(countInBeats(1, [4, 4])).toBe(4);
    expect(countInBeats(2, [3, 4])).toBe(6);
    expect(countInBeats(1, undefined)).toBe(4);
    expect(countInBeats(0, [4, 4])).toBe(0);
  });
});

describe('nextTrainedBpm', () => {
  const trainer = { enabled: true, step: 5, target: 100 };
  it('speeds up until the target', () => {
    expect(nextTrainedBpm(80, trainer)).toBe(85);
    expect(nextTrainedBpm(98, trainer)).toBe(100);
    expect(nextTrainedBpm(100, trainer)).toBe(100);
    expect(nextTrainedBpm(110, trainer)).toBe(110);
  });

  it('does nothing when off', () => {
    expect(nextTrainedBpm(80, { ...trainer, enabled: false })).toBe(80);
  });
});

describe('count-in setting', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    });
  });

  it('defaults to one bar and remembers the choice', () => {
    expect(loadCountInBars()).toBe(1);
    saveCountInBars(2);
    expect(loadCountInBars()).toBe(2);
    saveCountInBars(0);
    expect(loadCountInBars()).toBe(0);
  });
});
