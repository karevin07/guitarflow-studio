import { TabSection } from '../types';
import { createEmptyMeasure } from '../hooks/useEditorState';

const COLS = 16;

/** Minimal alphaTab score shape used by the converter (runtime objects). */
export interface AlphaTabScoreLike {
  title?: string;
  tracks?: AlphaTabTrackLike[];
}

export interface AlphaTabTrackLike {
  name?: string;
  shortName?: string;
  isPercussion?: boolean;
  staves?: AlphaTabStaffLike[];
}

export interface AlphaTabStaffLike {
  bars?: AlphaTabBarLike[];
}

export interface AlphaTabBarLike {
  voices?: AlphaTabVoiceLike[];
}

export interface AlphaTabVoiceLike {
  beats?: AlphaTabBeatLike[];
}

export interface AlphaTabBeatLike {
  notes?: AlphaTabNoteLike[];
  duration?: number;
}

export interface AlphaTabNoteLike {
  fret?: number;
  string?: number;
  isDead?: boolean;
}

const newSection = (title: string): TabSection => ({
  id: Math.random().toString(36).slice(2, 11),
  title,
  capo: 0,
  timeSignature: [4, 4],
  measures: [],
  chords: [],
  lyrics: [],
});

/** Map beat duration (alphaTab ticks) to column advance — PoC uses quarter ≈ 960. */
export const durationToColAdvance = (duration: number): number => {
  const quarter = 960;
  return Math.min(4, Math.max(1, Math.round(duration / quarter)));
};

/**
 * PoC: extract one guitar track from a loaded alphaTab score into gflow sections.
 * Returns null when the track is missing or has no playable bars.
 */
export const convertAlphaTabScoreToGflow = (
  score: AlphaTabScoreLike,
  trackIndex: number
): { title: string; sections: TabSection[]; customChords: []; transposeOffset: number } | null => {
  const track = score.tracks?.[trackIndex];
  if (!track || track.isPercussion) return null;

  const staff = track.staves?.[0];
  const bars = staff?.bars;
  if (!bars?.length) return null;

  const baseTitle = (score.title || track.name || 'Imported').trim() || 'Imported';
  const section = newSection(baseTitle);
  section.measures = [];
  section.chords = [];
  section.lyrics = [];

  for (const bar of bars) {
    const measure = createEmptyMeasure();
    let col = 0;

    for (const voice of bar.voices ?? []) {
      for (const beat of voice.beats ?? []) {
        if (col >= COLS) break;

        for (const note of beat.notes ?? []) {
          if (note.isDead) {
            const sIdx = normalizeStringIndex(note.string);
            if (sIdx != null) measure[sIdx][col] = 'x';
            continue;
          }
          const sIdx = normalizeStringIndex(note.string);
          if (sIdx == null || note.fret == null || note.fret < 0) continue;
          measure[sIdx][col] = String(note.fret);
        }

        col += durationToColAdvance(beat.duration ?? 960);
      }
    }

    section.measures.push(measure);
    section.chords.push(Array(COLS).fill(null));
    section.lyrics.push(Array(COLS).fill(null));
  }

  if (section.measures.length === 0) return null;

  return {
    title: `${baseTitle} (from GP)`,
    sections: [section],
    customChords: [],
    transposeOffset: 0,
  };
};

const normalizeStringIndex = (stringNum: number | undefined): number | null => {
  if (stringNum == null) return null;
  // alphaTab uses 1-6 for guitar; accept 0-5 as well
  if (stringNum >= 1 && stringNum <= 6) return stringNum - 1;
  if (stringNum >= 0 && stringNum <= 5) return stringNum;
  return null;
};

/** Pick first non-percussion track index, preferring names containing "guitar". */
export const pickGuitarTrackIndex = (score: AlphaTabScoreLike): number => {
  const tracks = score.tracks ?? [];
  const guitarIdx = tracks.findIndex(
    t => !t.isPercussion && /guitar/i.test(t.name ?? t.shortName ?? '')
  );
  if (guitarIdx >= 0) return guitarIdx;
  const anyIdx = tracks.findIndex(t => !t.isPercussion && (t.staves?.[0]?.bars?.length ?? 0) > 0);
  return anyIdx >= 0 ? anyIdx : 0;
};
