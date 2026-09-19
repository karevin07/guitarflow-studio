import { Chord } from '../../music-theory';

export interface Barre {
  fret: number;
  fromString: number;
  toString: number;
}

export type VoicingSource = 'curated' | 'generated';
export type VoicingTag = 'open' | 'barre' | 'easy' | 'jazz' | 'shell' | 'triad';
export type VoicingPosition = 'low' | 'middle' | 'high';

export interface ChordShape {
  /** App order: high e to low E; null means muted. */
  frets: Array<number | null>;
  fingers?: number[];
  barres?: Barre[];
  score: number;
  source: VoicingSource;
  tags: VoicingTag[];
}

export interface CuratedVoicing {
  name: string;
  frets: Array<number | null>;
  fingers?: number[];
  barres?: Barre[];
  tags?: VoicingTag[];
  difficulty?: number;
}

export interface VoicingSearchOptions {
  maxFret?: number;
  maxSpan?: number;
  minStrings?: number;
  limit?: number;
  position?: VoicingPosition;
}

export interface ChordVoicingResult {
  chord: Chord;
  symbol: string;
  shapes: ChordShape[];
}
