import { describe, expect, it } from 'vitest';
import { formatScale, getScalePitchClasses } from './scale';

describe('scales', () => {
  it.each([
    ['major', 0, [0, 2, 4, 5, 7, 9, 11]],
    ['naturalMinor', 9, [9, 11, 0, 2, 4, 5, 7]],
    ['majorPentatonic', 0, [0, 2, 4, 7, 9]],
    ['minorPentatonic', 9, [9, 0, 2, 4, 7]],
    ['blues', 9, [9, 0, 2, 3, 4, 7]],
    ['mixolydian', 7, [7, 9, 11, 0, 2, 4, 5]],
    ['dorian', 2, [2, 4, 5, 7, 9, 11, 0]],
    ['harmonicMinor', 9, [9, 11, 0, 2, 4, 5, 8]],
  ] as const)('builds %s from pitch %i', (type, root, expected) => {
    expect(getScalePitchClasses(root, type)).toEqual(expected);
  });

  it('formats scale names', () => {
    expect(formatScale(9, 'minorPentatonic')).toBe('A 小調五聲');
    expect(formatScale(10, 'major', 'flat')).toBe('Bb 大調音階');
  });
});
