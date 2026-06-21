import { describe, it, expect } from 'vitest';
import { colIndexToMs, formatPlaybackMs } from './playbackTime';

describe('colIndexToMs', () => {
  it('converts column index to ms at 120 BPM', () => {
    expect(colIndexToMs(8, 120)).toBe(1000);
    expect(colIndexToMs(16, 120)).toBe(2000);
  });

  it('scales inversely with BPM', () => {
    expect(colIndexToMs(4, 60)).toBe(1000);
    expect(colIndexToMs(4, 120)).toBe(500);
  });
});

describe('formatPlaybackMs', () => {
  it('formats seconds as m:ss', () => {
    expect(formatPlaybackMs(0)).toBe('0:00');
    expect(formatPlaybackMs(65000)).toBe('1:05');
    expect(formatPlaybackMs(125000)).toBe('2:05');
  });
});
