import { transposeChordSymbol } from '../music-theory';
import { TabSection } from '../types';
import { PlaybackPosition } from '../types/playback';

export interface SectionChordStep {
  sourceSymbol: string;
  effectiveSymbol: string;
  measureIdx: number;
  colIdx: number;
}

/** The chord symbol sounding at a playback position, looking back within the measure. */
export const chordAtPosition = (sections: TabSection[], playState: PlaybackPosition | null): string | null => {
  if (!playState) return null;
  const row = sections[playState.sectionIdx]?.chords[playState.measureIdx] ?? [];
  for (let index = Math.min(playState.colIdx, row.length - 1); index >= 0; index -= 1) {
    if (row[index]) return row[index];
  }
  return row.find(Boolean) ?? null;
};

/** Chord changes of one section in order; repeated consecutive symbols collapse into one step. */
export const sectionChordSteps = (section: TabSection, transposeOffset = 0): SectionChordStep[] => {
  const steps: SectionChordStep[] = [];
  section.chords.forEach((measure, measureIdx) => measure.forEach((sourceSymbol, colIdx) => {
    if (!sourceSymbol) return;
    if (steps[steps.length - 1]?.sourceSymbol === sourceSymbol) return;
    steps.push({
      sourceSymbol,
      effectiveSymbol: transposeChordSymbol(sourceSymbol, transposeOffset) ?? sourceSymbol,
      measureIdx,
      colIdx,
    });
  }));
  return steps;
};

/** Index of the step sounding at a measure/column, or -1 before the first chord. */
export const stepIndexAt = (steps: SectionChordStep[], measureIdx: number, colIdx: number): number => {
  let found = -1;
  steps.forEach((step, index) => {
    if (step.measureIdx < measureIdx || (step.measureIdx === measureIdx && step.colIdx <= colIdx)) found = index;
  });
  return found;
};
