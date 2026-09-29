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
      voicingPlan: {
        C: {
          position: 'low',
          lockedShape: { symbol: 'C', frets: [0, 1, 0, 2, 3, null] },
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.title).toBe('Test Song');
    expect(result.data.sections[0].timeSignature).toEqual([3, 4]);
    expect(result.data.customChords).toHaveLength(1);
    expect(result.data.voicingPlan.C.position).toBe('low');
    expect(result.data.voicingPlan.C.lockedShape?.frets).toEqual([0, 1, 0, 2, 3, null]);
  });

  it('drops malformed voicing preferences without rejecting the song', () => {
    const result = parseGflowFile({
      title: 'Legacy Song',
      sections: [{ title: 'Intro', measures: [emptyMeasure()] }],
      voicingPlan: {
        C: { position: 'sideways' },
        G: { position: 'high', lockedShape: { symbol: 'G', frets: [1, 2] } },
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.voicingPlan).toEqual({ G: { position: 'high' } });
  });

  it.each([
    [100, 100],
    [10, 40],
    [999, 240],
    ['fast', null],
    [undefined, null],
  ])('reads bpm %s as %s', (bpm, expected) => {
    const result = parseGflowFile({ title: 'Tempo', bpm, sections: [{ title: 'Verse' }] });
    expect(result.ok && result.data.bpm).toBe(expected);
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
