import { ChordDefinition, SongVoicingPlan, TabSection } from '../types';
import { SongFormEntry, formToStored } from './songForm';

export interface GflowExportInput {
  title: string;
  artist?: string;
  originalKey?: string;
  tags?: string[];
  sections: TabSection[];
  customChords: ChordDefinition[];
  voicingPlan: SongVoicingPlan;
  transposeOffset: number;
  bpm: number | null;
  form: SongFormEntry[];
}

/** The .gflow document for a song, the shape parseGflowFile reads back. */
export const serializeGflow = (song: GflowExportInput): string => JSON.stringify({
  title: song.title,
  artist: song.artist ?? '',
  originalKey: song.originalKey ?? '',
  tags: song.tags ?? [],
  sections: song.sections,
  customChords: song.customChords,
  voicingPlan: song.voicingPlan,
  transposeOffset: song.transposeOffset,
  bpm: song.bpm,
  form: formToStored(song.form, song.sections),
}, null, 2);

export const gflowFileName = (title: string): string =>
  `${title.trim().replace(/\s+/g, '_') || 'song'}.gflow`;
