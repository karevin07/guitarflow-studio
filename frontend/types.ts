
export type TabLine = string[]; // 6 strings

export interface TabSection {
  id: string;
  title: string;
  capo: number;
  measures: string[][][]; // [measureIndex][stringIndex][column]
  chords: (string | null)[][]; // [measureIndex][columnIdx]
  lyrics: (string | null)[][]; // [measureIndex][columnIdx]
}

export interface GuitarSong {
  id: string;
  title: string;
  lastModified: number;
  sections: TabSection[];
  customChords: ChordDefinition[];
  transposeOffset: number;
}

export interface ChordDefinition {
  name: string;
  frets: (number | null)[]; // e, B, G, D, A, E order or standard
}
