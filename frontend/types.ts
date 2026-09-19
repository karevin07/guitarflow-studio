
export type TabLine = string[]; // 6 strings

export interface TabSection {
  id: string;
  title: string;
  capo: number;
  timeSignature?: [number, number];
  measures: string[][][]; // [measureIndex][stringIndex][column]
  chords: (string | null)[][]; // [measureIndex][columnIdx]
  lyrics: (string | null)[][]; // [measureIndex][columnIdx]
}

export type SongSource = 'gflow' | 'imported';

export interface GuitarSong {
  id: string;
  title: string;
  lastModified: number;
  sections: TabSection[];
  customChords: ChordDefinition[];
  voicingPlan: SongVoicingPlan;
  transposeOffset: number;
  source?: 'gflow';
  isLegacy?: boolean;
}

export interface ImportedSong {
  id: string;
  title: string;
  lastModified: number;
  source: 'imported';
  importFormat: string;
  fileName: string;
  isLegacy?: boolean;
}

export type LibrarySong = GuitarSong | ImportedSong;

export const isImportedSong = (song: LibrarySong): song is ImportedSong =>
  song.source === 'imported';

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
