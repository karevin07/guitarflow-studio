import { describe, expect, it } from 'vitest';
import { TabSection } from '../types';
import {
  buildTimeline, formFromStored, formLabel, formToStored, playOrder, stepRange, timelineIndex, timelinePosition,
} from './songForm';

const section = (id: string, title: string, measures: number): TabSection => ({
  id, title, capo: 0, measures: Array.from({ length: measures }, () => []), chords: [], lyrics: [],
});
const sections = [section('a', '前奏', 1), section('b', '主歌', 2), section('c', '副歌', 2)];

describe('song form', () => {
  it('converts between stored indices and section ids', () => {
    const form = formFromStored([{ section: 0, repeat: 1 }, { section: 2, repeat: 2 }, { section: 9, repeat: 1 }, { section: 1, repeat: 99 }], sections);
    expect(form).toEqual([{ sectionId: 'a', repeat: 1 }, { sectionId: 'c', repeat: 2 }, { sectionId: 'b', repeat: 8 }]);
    // Reordering sections keeps the form pointing at the same sections.
    expect(formToStored(form, [sections[2], sections[0], sections[1]])).toEqual([
      { section: 1, repeat: 1 }, { section: 0, repeat: 2 }, { section: 2, repeat: 8 },
    ]);
    expect(formFromStored('bad', sections)).toEqual([]);
  });

  it('expands repeats and skips deleted sections', () => {
    const form = [{ sectionId: 'a', repeat: 1 }, { sectionId: 'c', repeat: 2 }, { sectionId: 'gone', repeat: 1 }, { sectionId: 'b', repeat: 1 }];
    expect(playOrder(form, sections)).toEqual([0, 2, 2, 1]);
    expect(playOrder([], sections)).toEqual([0, 1, 2]);
    expect(playOrder([{ sectionId: 'gone', repeat: 1 }], sections)).toEqual([0, 1, 2]);
    expect(formLabel(form, sections)).toBe('前奏 → 副歌 ×2 → 主歌');
  });

  it('maps playback columns through the play order', () => {
    const timeline = buildTimeline([0, 2, 2, 1], sections);
    expect(timeline.starts).toEqual([0, 16, 48, 80]);
    expect(timeline.total).toBe(112);
    expect(timelinePosition(timeline, 50)).toEqual({ sectionIdx: 2, measureIdx: 0, colIdx: 2, step: 2 });
    expect(timelineIndex(timeline, { sectionIdx: 2, measureIdx: 0, colIdx: 2, step: 2 })).toBe(50);
    // Without a step, a section maps to its first play at or after the given step.
    expect(timelineIndex(timeline, { sectionIdx: 2, measureIdx: 1, colIdx: 0 })).toBe(32);
    expect(timelineIndex(timeline, { sectionIdx: 2, measureIdx: 1, colIdx: 0 }, 2)).toBe(64);
    expect(timelineIndex(timeline, { sectionIdx: 1, measureIdx: 0, colIdx: 0, step: 0 })).toBe(80);
    expect(stepRange(timeline, 3)).toEqual({ start: 80, end: 111 });
    expect(stepRange(timeline, 4)).toBeNull();
  });
});
