import { describe, expect, it } from 'vitest';
import { getVoicingPosition } from '../guitar';
import { applicableLockedShape, parseVoicingPlan, resolvePlannedVoicing } from './voicingPlan';

describe('voicing plan', () => {
  it('keeps valid position preferences and locked shapes', () => {
    const plan = parseVoicingPlan({
      C: {
        position: 'low',
        lockedShape: { symbol: 'C', frets: [0, 1, 0, 2, 3, null] },
      },
    });
    expect(plan.C.position).toBe('low');
    expect(applicableLockedShape(plan.C, 'C')?.frets).toEqual([0, 1, 0, 2, 3, null]);
  });

  it('does not reuse an exact shape after the effective chord changes', () => {
    const plan = parseVoicingPlan({
      C: {
        position: 'low',
        lockedShape: { symbol: 'C', frets: [0, 1, 0, 2, 3, null] },
      },
    });
    expect(applicableLockedShape(plan.C, 'D')).toBeNull();
    expect(plan.C.position).toBe('low');
  });

  it('resolves a locked shape and falls back to the saved position after transposing', () => {
    const plan = parseVoicingPlan({
      C: {
        position: 'high',
        lockedShape: { symbol: 'C', frets: [8, 8, 9, 10, 10, 8] },
      },
    });
    expect(resolvePlannedVoicing('C', 'C', plan, [])?.frets).toEqual([8, 8, 9, 10, 10, 8]);

    const transposed = resolvePlannedVoicing('C', 'D', plan, []);
    expect(transposed).not.toBeNull();
    expect(transposed && getVoicingPosition(transposed.frets)).toBe('high');
  });
});
