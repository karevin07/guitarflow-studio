import {
  AccidentalPreference,
  KeyCandidate,
  detectKey,
  formatKey,
  keyAccidentalPreference,
  parseChord,
  toPitchClass,
  transposeChordSymbol,
} from '../music-theory';
import { TabSection } from '../types';

/** 'shape': read chords as fingered with the capo. 'concert': drop the capo and read the sounding key. */
export type CapoViewMode = 'shape' | 'concert';

const STORAGE_PREFIX = 'guitarflow-capo-view:';

export const loadCapoViewMode = (songId: string | null | undefined): CapoViewMode => {
  if (!songId) return 'shape';
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${songId}`) === 'concert' ? 'concert' : 'shape';
  } catch {
    return 'shape';
  }
};

export const saveCapoViewMode = (songId: string | null | undefined, mode: CapoViewMode): void => {
  if (!songId) return;
  try {
    if (mode === 'concert') localStorage.setItem(`${STORAGE_PREFIX}${songId}`, mode);
    else localStorage.removeItem(`${STORAGE_PREFIX}${songId}`);
  } catch {
    // Storage can be unavailable (private mode); the toggle still works for this visit.
  }
};

/** Capo of the first section with chords — the one the song's key is read in. */
export const primaryCapo = (sections: TabSection[]): number =>
  (sections.find(section => section.chords.some(row => row.some(Boolean))) ?? sections[0])?.capo ?? 0;

/** Semitones between the stored chord symbols and what a section displays. */
export const sectionDisplayShift = (capo: number, transpose: number, mode: CapoViewMode): number =>
  transpose + (mode === 'concert' ? capo : 0);

/** Key of the stored chords, shifted by `semitones`. */
export const shiftedSongKey = (sections: TabSection[], semitones: number): KeyCandidate | null => {
  const chords = sections.flatMap(section => section.chords.flat())
    .flatMap(symbol => {
      const chord = symbol ? parseChord(symbol) : null;
      return chord ? [chord] : [];
    });
  const key = detectKey(chords)[0];
  return key ? { ...key, tonic: toPitchClass(key.tonic + semitones) } : null;
};

/** Spell shifted chords the way the target key does, so capo 3 over G shows Bb, not A#. */
export const displaySpelling = (sections: TabSection[], semitones: number): AccidentalPreference | undefined => {
  if (semitones === 0) return undefined;
  const key = shiftedSongKey(sections, semitones);
  return key ? keyAccidentalPreference(key) : undefined;
};

export const shiftChordForDisplay = (
  symbol: string | null,
  semitones: number,
  spelling: AccidentalPreference | undefined
): string | null => transposeChordSymbol(symbol, semitones, spelling);

export const describeKey = (key: KeyCandidate | null): string => key ? formatKey(key) : '—';
