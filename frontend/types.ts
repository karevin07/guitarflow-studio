export interface TabSection {
  id: string;
  title: string;
  capo: number;
  timeSignature?: [number, number];
  /** Accompaniment rhythm notation (see services/accompaniment.ts); empty or missing means none. */
  pattern?: string;
  measures: string[][][]; // [measureIndex][stringIndex][column]
  chords: (string | null)[][]; // [measureIndex][columnIdx]
  lyrics: (string | null)[][]; // [measureIndex][columnIdx]
}

/** Library details shared by every kind of song. Changed through the song info endpoint only. */
export interface SongInfo {
  artist?: string;
  /** Key of the original recording, e.g. 'E' or 'C#m'. */
  originalKey?: string;
  tags?: string[];
  favorite?: boolean;
  /** Lowest and highest sung note of the original recording (MIDI). */
  melodyRange?: VocalRange | null;
}

export interface VocalRange {
  low: number;
  high: number;
}

export interface Setlist {
  id: string;
  name: string;
  /** Song ids in play order; ids of deleted songs are skipped when shown. */
  songIds: string[];
  lastModified: number;
}

export interface GuitarSong extends SongInfo {
  id: string;
  title: string;
  lastModified: number;
  /** Set by the server; tells songs apart across databases, where ids repeat. */
  createdAt?: number;
  sections: TabSection[];
  customChords: ChordDefinition[];
  voicingPlan: SongVoicingPlan;
  transposeOffset: number;
  /** Saved tempo; null or missing uses the player default. */
  bpm?: number | null;
  /** Play order as section positions with repeat counts; empty plays sections as written. */
  form?: Array<{ section: number; repeat: number }>;
}

export interface ChordDefinition {
  name: string;
  frets: (number | null)[]; // high e, B, G, D, A, low E; null = muted
  fingers?: number[];
  barres?: Array<{ fret: number; fromString: number; toString: number }>;
}

export type VoicingPositionPreference = 'recommended' | 'low' | 'middle' | 'high';

export interface LockedChordShape extends ChordDefinition {
  /** Effective chord symbol at the transpose offset where this shape was chosen. */
  symbol: string;
}

export interface SongVoicingPreference {
  position: VoicingPositionPreference;
  lockedShape?: LockedChordShape;
}

/** Keyed by the source chord symbol stored in the song. */
export type SongVoicingPlan = Record<string, SongVoicingPreference>;
