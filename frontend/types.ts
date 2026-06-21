
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
  transposeOffset: number;
  source?: 'gflow';
}

export interface ImportedSong {
  id: string;
  title: string;
  lastModified: number;
  source: 'imported';
  importFormat: string;
  fileName: string;
}

export type LibrarySong = GuitarSong | ImportedSong;

export const isImportedSong = (song: LibrarySong): song is ImportedSong =>
  song.source === 'imported';

export interface ChordDefinition {
  name: string;
  frets: (number | null)[]; // e, B, G, D, A, E order or standard
}
