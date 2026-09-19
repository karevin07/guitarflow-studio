import { findChordVoicings, getVoicingPosition, inferVoicingTags, voicingStartFret } from '../guitar';
import { ChordShape } from '../guitar/voicing/types';
import { transposeChordSymbol } from '../music-theory';
import { ChordDefinition, SongVoicingPlan, TabSection } from '../types';
import { applicableLockedShape } from './voicingPlan';

export type VoicingPlanStrategy = 'balanced' | 'easy' | 'low';

export interface ChordProgressionStep {
  sourceSymbol: string;
  effectiveSymbol: string;
}

export interface PlannedChordVoicing {
  sourceSymbol: string;
  effectiveSymbol: string;
  shape: ChordShape;
  occurrences: number;
  locked: boolean;
}

export interface VoicingPlanResult {
  strategy: VoicingPlanStrategy;
  progression: ChordProgressionStep[];
  suggestions: PlannedChordVoicing[];
  plan: SongVoicingPlan;
  transitionCost: number;
}

const shapeKey = (shape: Pick<ChordShape, 'frets'>): string => shape.frets.map(fret => fret ?? 'x').join(',');

export const extractChordProgression = (
  sections: TabSection[],
  transposeOffset = 0
): ChordProgressionStep[] => {
  const progression: ChordProgressionStep[] = [];
  sections.forEach(section => section.chords.forEach(measure => measure.forEach(sourceSymbol => {
    if (!sourceSymbol) return;
    const effectiveSymbol = transposeChordSymbol(sourceSymbol, transposeOffset) ?? sourceSymbol;
    const previous = progression[progression.length - 1];
    if (previous?.sourceSymbol === sourceSymbol && previous.effectiveSymbol === effectiveSymbol) return;
    progression.push({ sourceSymbol, effectiveSymbol });
  })));
  return progression;
};

export const voicingTransitionCost = (left: ChordShape, right: ChordShape): number => {
  let cost = 0;
  left.frets.forEach((leftFret, index) => {
    const rightFret = right.frets[index];
    if (leftFret === null && rightFret === null) return;
    if (leftFret === null || rightFret === null) {
      cost += 2.5;
      return;
    }
    cost += Math.min(7, Math.abs(leftFret - rightFret));
  });
  cost += Math.abs(voicingStartFret(left.frets) - voicingStartFret(right.frets)) * 1.4;
  if (left.tags.includes('barre') !== right.tags.includes('barre')) cost += 3;
  return Math.round(cost * 10) / 10;
};

const intrinsicCost = (shape: ChordShape, strategy: VoicingPlanStrategy): number => {
  const pressed = shape.frets.filter((fret): fret is number => fret !== null && fret > 0);
  const start = voicingStartFret(shape.frets);
  const span = pressed.length ? Math.max(...pressed) - Math.min(...pressed) : 0;
  const muted = shape.frets.filter(fret => fret === null).length;
  const open = shape.frets.filter(fret => fret === 0).length;
  const barre = shape.tags.includes('barre') ? 1 : 0;
  const qualityPenalty = Math.max(0, 165 - shape.score);
  if (strategy === 'easy') {
    return span * 7 + start * 1.2 + barre * 7 + muted * muted * 6 - open * 1.5 + qualityPenalty * 0.3;
  }
  if (strategy === 'low') return start * 5 + span * 3 + barre * 2 + muted * 2 - open + qualityPenalty * 0.25;
  return qualityPenalty * 0.3 + span * 2 + barre * 1.5;
};

const lockedChordShape = (definition: ChordDefinition): ChordShape => ({
  frets: [...definition.frets],
  fingers: definition.fingers,
  barres: definition.barres,
  score: 200,
  source: 'curated',
  tags: inferVoicingTags(definition.frets, definition.barres),
});

const candidatesFor = (
  step: ChordProgressionStep,
  chordLibrary: ChordDefinition[],
  existingPlan: SongVoicingPlan
): ChordShape[] => {
  const preference = existingPlan[step.sourceSymbol];
  const locked = applicableLockedShape(preference, step.effectiveSymbol);
  if (locked) return [lockedChordShape(locked)];

  const position = preference?.position === 'recommended' ? undefined : preference?.position;
  const preferred = findChordVoicings(
    step.effectiveSymbol,
    chordLibrary,
    undefined,
    { limit: 8, ...(position ? { position } : {}) }
  )?.shapes ?? [];
  if (preferred.length > 0) return preferred;
  return findChordVoicings(step.effectiveSymbol, chordLibrary, undefined, { limit: 8 })?.shapes ?? [];
};

export const planSongVoicings = ({
  sections,
  chordLibrary,
  existingPlan = {},
  transposeOffset = 0,
  strategy = 'balanced',
}: {
  sections: TabSection[];
  chordLibrary: ChordDefinition[];
  existingPlan?: SongVoicingPlan;
  transposeOffset?: number;
  strategy?: VoicingPlanStrategy;
}): VoicingPlanResult => {
  const progression = extractChordProgression(sections, transposeOffset);
  if (progression.length === 0) {
    return { strategy, progression, suggestions: [], plan: { ...existingPlan }, transitionCost: 0 };
  }

  const candidateCache = new Map<string, ChordShape[]>();
  progression.forEach(step => {
    if (!candidateCache.has(step.sourceSymbol)) {
      candidateCache.set(step.sourceSymbol, candidatesFor(step, chordLibrary, existingPlan));
    }
  });
  const usableProgression = progression.filter(step => (candidateCache.get(step.sourceSymbol)?.length ?? 0) > 0);
  if (usableProgression.length === 0) {
    return { strategy, progression, suggestions: [], plan: { ...existingPlan }, transitionCost: 0 };
  }

  const costs: number[][] = [];
  const previousIndices: number[][] = [];
  usableProgression.forEach((step, stepIndex) => {
    const candidates = candidateCache.get(step.sourceSymbol) ?? [];
    costs[stepIndex] = [];
    previousIndices[stepIndex] = [];
    candidates.forEach((candidate, candidateIndex) => {
      const ownCost = intrinsicCost(candidate, strategy);
      if (stepIndex === 0) {
        costs[stepIndex][candidateIndex] = ownCost;
        previousIndices[stepIndex][candidateIndex] = -1;
        return;
      }
      const previousStep = usableProgression[stepIndex - 1];
      const previousCandidates = candidateCache.get(previousStep.sourceSymbol) ?? [];
      let bestCost = Number.POSITIVE_INFINITY;
      let bestIndex = 0;
      previousCandidates.forEach((previous, previousIndex) => {
        const transitionWeight = strategy === 'balanced' ? 1 : strategy === 'easy' ? 0.75 : 0.55;
        const cost = costs[stepIndex - 1][previousIndex]
          + voicingTransitionCost(previous, candidate) * transitionWeight
          + ownCost;
        if (cost < bestCost) {
          bestCost = cost;
          bestIndex = previousIndex;
        }
      });
      costs[stepIndex][candidateIndex] = bestCost;
      previousIndices[stepIndex][candidateIndex] = bestIndex;
    });
  });

  const lastCosts = costs[costs.length - 1];
  let candidateIndex = lastCosts.indexOf(Math.min(...lastCosts));
  const chosen: ChordShape[] = Array(usableProgression.length);
  for (let stepIndex = usableProgression.length - 1; stepIndex >= 0; stepIndex -= 1) {
    const step = usableProgression[stepIndex];
    chosen[stepIndex] = (candidateCache.get(step.sourceSymbol) ?? [])[candidateIndex];
    candidateIndex = previousIndices[stepIndex][candidateIndex];
  }

  const grouped = new Map<string, { step: ChordProgressionStep; shapes: ChordShape[]; count: number }>();
  usableProgression.forEach((step, index) => {
    const current = grouped.get(step.sourceSymbol) ?? { step, shapes: [], count: 0 };
    current.shapes.push(chosen[index]);
    current.count += 1;
    grouped.set(step.sourceSymbol, current);
  });

  const suggestions = Array.from(grouped.values()).map(({ step, shapes, count }) => {
    const frequency = new Map<string, { shape: ChordShape; count: number }>();
    shapes.forEach(shape => {
      const key = shapeKey(shape);
      const item = frequency.get(key) ?? { shape, count: 0 };
      item.count += 1;
      frequency.set(key, item);
    });
    const shape = Array.from(frequency.values())
      .sort((left, right) => right.count - left.count || right.shape.score - left.shape.score)[0].shape;
    return {
      sourceSymbol: step.sourceSymbol,
      effectiveSymbol: step.effectiveSymbol,
      shape,
      occurrences: count,
      locked: Boolean(applicableLockedShape(existingPlan[step.sourceSymbol], step.effectiveSymbol)),
    };
  });

  const plan: SongVoicingPlan = { ...existingPlan };
  suggestions.forEach(suggestion => {
    plan[suggestion.sourceSymbol] = {
      position: getVoicingPosition(suggestion.shape.frets),
      lockedShape: {
        symbol: suggestion.effectiveSymbol,
        name: suggestion.effectiveSymbol,
        frets: [...suggestion.shape.frets],
        fingers: suggestion.shape.fingers,
        barres: suggestion.shape.barres,
      },
    };
  });

  const transitionCost = suggestions.length < 2 ? 0 : chosen.slice(1).reduce(
    (total, shape, index) => total + voicingTransitionCost(chosen[index], shape),
    0
  );
  return {
    strategy,
    progression,
    suggestions,
    plan,
    transitionCost: Math.round(transitionCost * 10) / 10,
  };
};
