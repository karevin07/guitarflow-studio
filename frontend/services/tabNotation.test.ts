import { describe, it, expect } from 'vitest';
import {
  cellToFret,
  parseTabCellPitches,
  isMutedCell,
  getTechniqueInputHint,
  revertPendingTechnique,
} from './tabNotation';

describe('cellToFret', () => {
  it('parses simple frets', () => {
    expect(cellToFret('7')).toBe(7);
    expect(cellToFret('12')).toBe(12);
  });

  it('returns null for empty or muted cells', () => {
    expect(cellToFret('-')).toBeNull();
    expect(cellToFret('x')).toBeNull();
  });
});

describe('parseTabCellPitches', () => {
  it('parses techniques into two pitches', () => {
    expect(parseTabCellPitches('5h7')).toEqual([5, 7]);
    expect(parseTabCellPitches('7p5')).toEqual([7, 5]);
    expect(parseTabCellPitches('7b9')).toEqual([7, 9]);
  });

  it('parses a single fret', () => {
    expect(parseTabCellPitches('3')).toEqual([3]);
  });
});

describe('isMutedCell', () => {
  it('detects muted strings', () => {
    expect(isMutedCell('x')).toBe(true);
    expect(isMutedCell('X')).toBe(true);
    expect(isMutedCell('5')).toBe(false);
  });
});

describe('getTechniqueInputHint', () => {
  it('returns hints for incomplete techniques', () => {
    expect(getTechniqueInputHint('7b')?.kind).toBe('bend');
    expect(getTechniqueInputHint('5h')?.kind).toBe('hammer');
    expect(getTechniqueInputHint('7p')?.kind).toBe('pull');
  });

  it('returns null for complete or plain notes', () => {
    expect(getTechniqueInputHint('7b9')).toBeNull();
    expect(getTechniqueInputHint('7')).toBeNull();
  });
});

describe('revertPendingTechnique', () => {
  it('strips pending technique suffix', () => {
    expect(revertPendingTechnique('7b')).toBe('7');
    expect(revertPendingTechnique('5h')).toBe('5');
  });

  it('returns null when nothing to revert', () => {
    expect(revertPendingTechnique('7b9')).toBeNull();
    expect(revertPendingTechnique('7')).toBeNull();
  });
});
