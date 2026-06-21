import { describe, it, expect } from 'vitest';
import { parseGflowFile } from './gflowImport';

const emptyMeasure = () => Array.from({ length: 6 }, () => Array(16).fill('-'));

describe('parseGflowFile', () => {
  it('accepts a valid gflow payload', () => {
    const result = parseGflowFile({
      title: 'Test Song',
      transposeOffset: 2,
      sections: [
        {
          id: 'sec1',
          title: 'Intro',
          capo: 1,
          timeSignature: [3, 4],
          measures: [emptyMeasure()],
          chords: [Array(16).fill(null)],
          lyrics: [Array(16).fill(null)],
        },
      ],
      customChords: [{ name: 'C', frets: [0, 1, 0, 2, 3, null] }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.title).toBe('Test Song');
    expect(result.data.sections[0].timeSignature).toEqual([3, 4]);
    expect(result.data.customChords).toHaveLength(1);
  });

  it('rejects invalid JSON shape', () => {
    const result = parseGflowFile(null);
    if (!result.ok) {
      expect(result.error).toMatch(/JSON object/i);
    } else {
      expect.fail('expected parse failure');
    }
  });

  it('rejects sections with invalid measure width', () => {
    const result = parseGflowFile({
      title: 'Bad',
      sections: [{ title: 'X', measures: [[['-']]] }],
    });
    expect(result.ok).toBe(false);
  });
});
