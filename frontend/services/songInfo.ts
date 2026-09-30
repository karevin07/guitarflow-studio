import { LibrarySong, Setlist } from '../types';

/** Title, artist or a tag contains the query (case-insensitive). */
export const matchesSearch = (song: LibrarySong, query: string): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [song.title, song.artist ?? '', ...(song.tags ?? [])].some(text => text.toLowerCase().includes(needle));
};

/** Every tag used in the library, most used first, then alphabetically. */
export const libraryTags = (songs: LibrarySong[]): string[] => {
  const counts = new Map<string, number>();
  songs.forEach(song => (song.tags ?? []).forEach(tag => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag);
};

/** "抒情, 表演，民謠" → ['抒情', '表演', '民謠'], trimmed and without duplicates. */
export const parseTagInput = (text: string): string[] => {
  const tags: string[] = [];
  text.split(/[,，、\n]/).forEach(part => {
    const tag = part.trim().slice(0, 24);
    if (tag && !tags.includes(tag)) tags.push(tag);
  });
  return tags.slice(0, 12);
};

/** The setlist's songs in order, skipping ones that were deleted. */
export const setlistSongs = (setlist: Setlist, songs: LibrarySong[]): LibrarySong[] => {
  const byId = new Map(songs.map(song => [song.id, song]));
  return setlist.songIds.map(id => byId.get(id)).filter((song): song is LibrarySong => Boolean(song));
};

export interface SetlistPosition {
  index: number;
  total: number;
  previous: LibrarySong | null;
  next: LibrarySong | null;
}

/** Where a song sits in a setlist, or null when it is not in it. */
export const setlistPosition = (setlist: Setlist, songs: LibrarySong[], songId: string): SetlistPosition | null => {
  const ordered = setlistSongs(setlist, songs);
  const index = ordered.findIndex(song => song.id === songId);
  if (index < 0) return null;
  return { index, total: ordered.length, previous: ordered[index - 1] ?? null, next: ordered[index + 1] ?? null };
};

/** Move one item up (-1) or down (+1); out-of-range moves return the list unchanged. */
export const moveItem = <T,>(items: T[], index: number, offset: -1 | 1): T[] => {
  const target = index + offset;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export const COMMON_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
  'Am', 'Bbm', 'Bm', 'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m'];
