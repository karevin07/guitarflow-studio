import { describe, it, expect } from 'vitest';
import {
  applyNotationAction,
  canApplyNotationAction,
  buildCellFromInspector,
  parseCellForInspector,
} from './notationInput';

describe('applyNotationAction', () => {
  it('applies mute', () => {
    expect(applyNotationAction('-', 'mute')).toBe('x');
    expect(applyNotationAction('7', 'mute')).toBe('x');
  });

  it('appends h/p/b to digit cells', () => {
    expect(applyNotationAction('5', 'hammer')).toBe('5h');
    expect(applyNotationAction('7', 'pull')).toBe('7p');
    expect(applyNotationAction('7', 'bend')).toBe('7b');
  });

  it('rejects h/p/b without a starting fret', () => {
    expect(applyNotationAction('-', 'hammer')).toBeNull();
    expect(applyNotationAction('5h', 'pull')).toBeNull();
  });

  it('appends or starts slide notation', () => {
    expect(applyNotationAction('5', 'slide-up')).toBe('5s');
    expect(applyNotationAction('5', 'slide-down')).toBe('5/');
    expect(applyNotationAction('-', 'slide-up')).toBe('s');
    expect(applyNotationAction('-', 'slide-down')).toBe('/');
  });

  it('does not double-append slide markers', () => {
    expect(applyNotationAction('5s', 'slide-up')).toBe('s');
  });
});

describe('canApplyNotationAction', () => {
  it('mirrors applyNotationAction nullability', () => {
    expect(canApplyNotationAction('5', 'hammer')).toBe(true);
    expect(canApplyNotationAction('-', 'hammer')).toBe(false);
    expect(canApplyNotationAction('-', 'slide-up')).toBe(true);
  });
});

describe('cellInspector', () => {
  it('round-trips note values including pending techniques', () => {
    const cases = ['-', 'x', '7', '5h7', '7p5', '7b9', '5s', '5/', '7b', '5h'];
    for (const cell of cases) {
      expect(buildCellFromInspector(parseCellForInspector(cell))).toBe(cell);
    }
  });
});
