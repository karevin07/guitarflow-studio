import { detectKey, formatKey, parseChord } from '../music-theory';
import { GuitarSong, LibrarySong, isImportedSong } from '../types';

export const greetingFor = (date: Date): string => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return '早安';
  if (hour >= 11 && hour < 18) return '午安';
  if (hour >= 18) return '晚上好';
  return '夜深了';
};

const chordCells = (song: GuitarSong): string[] =>
  song.sections.flatMap(section => section.chords.flat()).filter((name): name is string => Boolean(name));

/** Chords that appear most across the user's own songs, most frequent first. */
export const commonChords = (songs: LibrarySong[], limit = 6): string[] => {
  const counts = new Map<string, number>();
  songs.forEach(song => {
    if (isImportedSong(song)) return;
    chordCells(song).forEach(name => counts.set(name, (counts.get(name) ?? 0) + 1));
  });
  // Map keeps first-seen order, so ties stay in the order the chords were met.
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
};

/** Detected key of a song's chords, or null when there are none. */
export const songKeyLabel = (song: GuitarSong): string | null => {
  const chords = chordCells(song).flatMap(name => {
    const chord = parseChord(name);
    return chord ? [chord] : [];
  });
  const key = detectKey(chords)[0];
  return key ? formatKey(key) : null;
};

/** Friendly name for the greeting: the part before "@", clipped so it never breaks the layout. */
export const displayNameFor = (username: string | undefined, maxLength = 16): string => {
  if (!username) return '吉他手';
  const name = username.split('@')[0] || username;
  return name.length > maxLength ? `${name.slice(0, maxLength - 1)}…` : name;
};
