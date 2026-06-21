import { describe, it, expect } from 'vitest';
import {
  convertAlphaTabScoreToGflow,
  durationToColAdvance,
  pickGuitarTrackIndex,
} from './gpToGflow';

describe('durationToColAdvance', () => {
  it('maps quarter notes to 1 column', () => {
    expect(durationToColAdvance(960)).toBe(1);
    expect(durationToColAdvance(1920)).toBe(2);
  });
});

describe('convertAlphaTabScoreToGflow', () => {
  const mockScore = {
    title: 'Test Riff',
    tracks: [
      {
        name: 'Guitar',
        isPercussion: false,
        staves: [
          {
            bars: [
              {
                voices: [
                  {
                    beats: [
                      {
                        duration: 960,
                        notes: [{ string: 1, fret: 7 }, { string: 2, fret: 5 }],
                      },
                      {
                        duration: 960,
                        notes: [{ string: 1, fret: 9 }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  it('converts beats to gflow measures', () => {
    const result = convertAlphaTabScoreToGflow(mockScore, 0);
    expect(result).not.toBeNull();
    expect(result!.sections[0].measures).toHaveLength(1);
    expect(result!.sections[0].measures[0][0][0]).toBe('7');
    expect(result!.sections[0].measures[0][1][0]).toBe('5');
    expect(result!.sections[0].measures[0][0][1]).toBe('9');
  });

  it('returns null for percussion', () => {
    expect(convertAlphaTabScoreToGflow({ tracks: [{ isPercussion: true, staves: [{ bars: [{}] }] }] }, 0)).toBeNull();
  });
});

describe('pickGuitarTrackIndex', () => {
  it('prefers guitar-named track', () => {
    const idx = pickGuitarTrackIndex({
      tracks: [
        { name: 'Drums', isPercussion: true, staves: [{ bars: [{}] }] },
        { name: 'Clean Guitar', staves: [{ bars: [{}] }] },
      ],
    });
    expect(idx).toBe(1);
  });
});
