import { describe, expect, it } from 'vitest';
import { Chord, parseChord } from './chord';
import { analyzeChordFunction, detectKey, formatKey } from './key';

const chords = (symbols: string): Chord[] => symbols.split(' ').map(symbol => parseChord(symbol)!);
const C_MAJOR = { tonic: 0, mode: 'major' } as const;

describe('detectKey', () => {
  it.each([
    ['C G Am Em F C Dm7 G', 'C'],
    ['C G Am Em F C Dm7 G C', 'C'],
    ['Am F C G', 'Am'],
    ['D A Bm G', 'D'],
    ['Em C G D Em', 'Em'],
    ['F Bb C F', 'F'],
  ])('%s is in %s', (progression, expected) => {
    expect(formatKey(detectKey(chords(progression))[0])).toBe(expected);
  });

  it('accepts the major V chord in a minor key', () => {
    expect(formatKey(detectKey(chords('Am Dm E7 Am'))[0])).toBe('Am');
  });

  it('is confident about a clear diatonic progression', () => {
    expect(detectKey(chords('C F G7 C'))[0].confidence).toBe('high');
  });

  it('returns nothing for an empty progression', () => {
    expect(detectKey([])).toEqual([]);
  });
});

describe('analyzeChordFunction', () => {
  it.each([
    ['C', 'I'],
    ['Am', 'vi'],
    ['Dm7', 'ii7'],
    ['G7', 'V7'],
    ['Bm7b5', 'viiø7'],
    ['Bb', '♭VII'],
  ])('labels %s as %s in C', (symbol, numeral) => {
    expect(analyzeChordFunction(parseChord(symbol)!, C_MAJOR).numeral).toBe(numeral);
  });

  it.each([
    ['C7', 'V7/IV', 5],
    ['E7', 'V7/vi', 9],
    ['D', 'V/V', 7],
    ['A7', 'V7/ii', 2],
  ])('recognizes %s as %s', (symbol, secondary, target) => {
    const fn = analyzeChordFunction(parseChord(symbol)!, C_MAJOR);
    expect(fn.diatonic).toBe(false);
    expect(fn.secondaryDominant).toBe(secondary);
    expect(fn.target).toBe(target);
  });

  it('does not call a borrowed chord a secondary dominant when its target is the tonic', () => {
    expect(analyzeChordFunction(parseChord('G')!, C_MAJOR).secondaryDominant).toBeUndefined();
  });
});
