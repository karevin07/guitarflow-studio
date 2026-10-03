import { GuitarSong, Setlist, SongInfo } from '../types';
import { apiFetch } from './apiClient';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const fetchAllPages = async <T>(path: string): Promise<T[]> => {
  const items: T[] = [];
  let nextPath: string | null = path;

  while (nextPath) {
    const page = await apiFetch<PaginatedResponse<T> | T[]>(nextPath);
    if (Array.isArray(page)) {
      return page;
    }
    items.push(...page.results);
    if (!page.next) break;
    const url = new URL(page.next);
    nextPath = `${url.pathname.replace(/^\/api/, '')}${url.search}`;
  }

  return items;
};

const pickSongInfo = (song: SongInfo): SongInfo => ({
  artist: song.artist ?? '',
  originalKey: song.originalKey ?? '',
  tags: song.tags ?? [],
  favorite: song.favorite ?? false,
  melodyRange: song.melodyRange ?? null,
});

export const api = {
  async fetchSongs(search?: string): Promise<GuitarSong[]> {
    const query = new URLSearchParams({ page_size: '200' });
    if (search?.trim()) query.set('search', search.trim());
    const songs = await fetchAllPages<GuitarSong>(`/songs/?${query.toString()}`);
    return songs.map(song => ({ ...song, isLegacy: song.isLegacy ?? false }));
  },

  async getSong(id: string): Promise<GuitarSong> {
    return apiFetch(`/songs/${id}/`);
  },

  async createSong(song: Omit<GuitarSong, 'id'>): Promise<GuitarSong> {
    return apiFetch('/songs/', {
      method: 'POST',
      body: JSON.stringify(song),
    });
  },

  async updateSong(id: string, song: Omit<GuitarSong, 'id'>): Promise<GuitarSong> {
    return apiFetch(`/songs/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(song),
    });
  },

  /** Change library details (title, artist, key, tags, favorite) without sending the whole song. */
  async updateSongInfo(id: string, info: SongInfo & { title?: string }): Promise<SongInfo & { title: string; lastModified: number }> {
    const song = await apiFetch<GuitarSong>(`/songs/${id}/info/`, {
      method: 'PATCH',
      body: JSON.stringify(info),
    });
    return { ...pickSongInfo(song), title: song.title, lastModified: song.lastModified };
  },

  async fetchSetlists(): Promise<Setlist[]> {
    return apiFetch('/setlists/');
  },

  async createSetlist(setlist: Pick<Setlist, 'name' | 'songIds'>): Promise<Setlist> {
    return apiFetch('/setlists/', { method: 'POST', body: JSON.stringify(setlist) });
  },

  async updateSetlist(id: string, changes: Partial<Pick<Setlist, 'name' | 'songIds'>>): Promise<Setlist> {
    return apiFetch(`/setlists/${id}/`, { method: 'PATCH', body: JSON.stringify(changes) });
  },

  async deleteSetlist(id: string): Promise<void> {
    await apiFetch(`/setlists/${id}/`, { method: 'DELETE' });
  },

  async deleteSong(id: string): Promise<void> {
    await apiFetch(`/songs/${id}/`, { method: 'DELETE' });
  },

  async claimSong(id: string): Promise<GuitarSong> {
    return apiFetch(`/songs/${id}/claim/`, { method: 'POST' });
  },

  async claimLegacySongs(): Promise<{ claimed: number }> {
    return apiFetch('/songs/claim-legacy/', { method: 'POST' });
  },

  async fetchGlobalChords(): Promise<Omit<GuitarSong['customChords'][number], 'isStandard'>[]> {
    return apiFetch('/global-chords/');
  },
};
