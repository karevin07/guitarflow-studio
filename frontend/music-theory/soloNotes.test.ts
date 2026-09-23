import { describe, expect, it } from 'vitest';
import { parseChord } from './chord';
import { analyzeChordForSolo, guideToneMove, keySafeScales, scaleAccidentalPreference } from './soloNotes';

const C_MAJOR = { tonic: 0, mode: 'major' } as const;
const analyze = (symbol: string, key: { tonic: 0 | 9; mode: 'major' | 'minor' } = C_MAJOR) =>
  analyzeChordForSolo(parseChord(symbol)!, key);

describe('analyzeChordForSolo', () => {
  it('classifies notes over a diatonic triad', () => {
    const { roles, targets, scale } = analyze('C');
    expect(scale).toEqual({ root: 0, type: 'major' });
    expect(roles[0]).toBe('root');
    expect(roles[4]).toBe('third');
    expect(roles[7]).toBe('fifth');
    expect(roles[2]).toBe('tension');
    expect(roles[9]).toBe('tension');
    expect(roles[5]).toBe('passing');
    expect(roles[10]).toBe('outside');
    expect(targets).toEqual([4, 0]);
  });

  it('targets the third and seventh of a seventh chord', () => {
    expect(analyze('Dm7').targets).toEqual([5, 0]);
  });

  it('switches to mixolydian for a secondary dominant', () => {
    const { scale, roles, function: fn } = analyze('C7');
    expect(fn.secondaryDominant).toBe('V7/IV');
    expect(scale.root).toBe(0);
    expect(scale.type).toBe('mixolydian');
    expect(scale.reason).toContain('V7/IV');
    expect(roles[10]).toBe('seventh');
    expect(roles[11]).toBe('outside');
  });

  it('uses harmonic minor of the target when resolving to a minor chord', () => {
    const { scale } = analyze('E7');
    expect(scale).toMatchObject({ root: 9, type: 'harmonicMinor' });
  });

  it('uses the parallel minor for borrowed chords', () => {
    expect(analyze('Fm').scale).toMatchObject({ root: 0, type: 'naturalMinor' });
  });

  it('uses harmonic minor over the V chord in a minor key', () => {
    expect(analyze('E', { tonic: 9, mode: 'minor' }).scale).toMatchObject({ root: 9, type: 'harmonicMinor' });
  });

  it('keeps the slash-chord bass note', () => {
    const analysis = analyze('G/B');
    expect(analysis.bass).toBe(11);
    expect(analysis.function.numeral).toBe('V');
    expect(analyze('G').bass).toBeUndefined();
  });
});

describe('guideToneMove', () => {
  it('resolves B of G up a half step to C of C', () => {
    expect(guideToneMove(analyze('G'), analyze('C'))).toEqual({ from: 11, to: 0, semitones: 1 });
  });

  it('prefers a common tone', () => {
    expect(guideToneMove(analyze('C'), analyze('Am'))).toMatchObject({ semitones: 0 });
  });
});

describe('keySafeScales', () => {
  it('suggests pentatonic scales for a major key', () => {
    expect(keySafeScales(C_MAJOR).map(scale => [scale.root, scale.type])).toEqual([
      [0, 'majorPentatonic'],
      [9, 'minorPentatonic'],
      [0, 'major'],
    ]);
  });
});

describe('scaleAccidentalPreference', () => {
  it.each([
    [0, 'mixolydian', 'flat'],
    [0, 'major', 'sharp'],
    [9, 'harmonicMinor', 'sharp'],
    [2, 'dorian', 'sharp'],
    [5, 'major', 'flat'],
  ] as const)('spells root %i %s with %s', (root, type, expected) => {
    expect(scaleAccidentalPreference({ root, type })).toBe(expected);
  });
});
