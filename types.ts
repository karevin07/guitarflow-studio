
export type TabLine = string[]; // 6 strings

export interface TabSection {
  id: string;
  title: string;
  capo: number; // New: 0 (no capo) to 12
  measures: string[][][]; // [measureIndex][stringIndex][column]
  chords: (string | null)[][]; // [measureIndex][columnIdx]
  lyrics: (string | null)[][]; // [measureIndex][columnIdx]
}

export interface GuitarSong {
  title: string;
  artist: string;
  tempo: number;
  key: string;
  tuning: string;
  sections: TabSection[];
}

export interface ChordDefinition {
  name: string;
  frets: (number | null)[]; // e, B, G, D, A, E order or standard
}
