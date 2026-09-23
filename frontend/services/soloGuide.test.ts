import { describe, expect, it } from 'vitest';
import { analyzeChordForSolo, parseChord } from '../music-theory';
import { buildChordMarks, buildScaleMarks, describeFretPosition, describeMotion, positionsForPitch } from './soloGuide';

const C_MAJOR = { tonic: 0, mode: 'major' } as const;

describe('buildChordMarks', () => {
  const analysis = analyzeChordForSolo(parseChord('G')!, C_MAJOR);

  it('labels notes by name', () => {
    const marks = buildChordMarks(analysis, 'name', 'sharp');
    expect(marks[11]).toEqual({ role: 'third', label: 'B' });
    expect(marks[0]).toEqual({ role: 'passing', label: 'C' });
    expect(marks[1]).toBeNull();
  });

  it('labels chord degrees and extensions', () => {
    const marks = buildChordMarks(analysis, 'degree', 'sharp');
    expect(marks[7]?.label).toBe('1');
    expect(marks[11]?.label).toBe('3');
    expect(marks[9]?.label).toBe('9');
    expect(marks[4]?.label).toBe('13');
  });
});

describe('buildScaleMarks', () => {
  it('marks the scale root separately', () => {
    const marks = buildScaleMarks({ root: 9, type: 'minorPentatonic' }, 'degree', 'sharp');
    expect(marks[9]).toEqual({ role: 'root', label: '1' });
    expect(marks[0]).toEqual({ role: 'scale', label: '♭3' });
    expect(marks[11]).toBeNull();
  });
});

describe('positions', () => {
  it('prefers treble strings inside the range', () => {
    const positions = positionsForPitch(11, { from: 0, to: 4 });
    expect(positions.map(describeFretPosition)).toEqual(['2 弦 (B) 0 格', '3 弦 (G) 4 格']);
  });

  it('describes guide tone motion', () => {
    expect(describeMotion(0)).toBe('保持共同音');
    expect(describeMotion(1)).toBe('上行半音');
    expect(describeMotion(-2)).toBe('下行全音');
  });
});
