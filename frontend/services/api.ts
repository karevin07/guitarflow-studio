import { GuitarSong, ImportedSong } from '../types';
import { apiFetch, authStorage, getApiBaseUrl } from './apiClient';

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

export const api = {
  async fetchSongs(search?: string): Promise<GuitarSong[]> {
    const query = new URLSearchParams({ source: 'gflow', page_size: '200' });
    if (search?.trim()) query.set('search', search.trim());
    const songs = await fetchAllPages<GuitarSong>(`/songs/?${query.toString()}`);
    return songs.map(song => ({ ...song, source: 'gflow' as const, isLegacy: song.isLegacy ?? false }));
  },

  async fetchImportedScores(search?: string): Promise<ImportedSong[]> {
    const query = new URLSearchParams({ source: 'imported', page_size: '200' });
    if (search?.trim()) query.set('search', search.trim());
    const songs = await fetchAllPages<ImportedSong & { importFormat?: string; fileName?: string; isLegacy?: boolean }>(
      `/songs/?${query.toString()}`
    );
    return songs.map(song => ({
      id: song.id,
      title: song.title,
      lastModified: song.lastModified,
      source: 'imported' as const,
      importFormat: song.importFormat ?? 'unknown',
      fileName: song.fileName ?? 'imported-score',
      isLegacy: song.isLegacy ?? false,
    }));
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

  async updateImportedScoreTitle(id: string, title: string): Promise<ImportedSong> {
    const song = await apiFetch<GuitarSong & { importFormat?: string; fileName?: string }>(`/songs/${id}/`, {
      method: 'PUT',
      body: JSON.stringify({
        title,
        transposeOffset: 0,
        sections: [],
        customChords: [],
      }),
    });
    return {
      id: song.id,
      title: song.title,
      lastModified: song.lastModified,
      source: 'imported',
      importFormat: song.importFormat ?? 'unknown',
      fileName: song.fileName ?? 'imported-score',
    };
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

  async uploadImportedScore(file: File, title?: string): Promise<ImportedSong> {
    const formData = new FormData();
    formData.append('file', file);
    if (title?.trim()) formData.append('title', title.trim());

    const song = await apiFetch<ImportedSong & { importFormat?: string; fileName?: string }>(
      '/songs/import-score/',
      {
        method: 'POST',
        body: formData,
      }
    );

    return {
      id: song.id,
      title: song.title,
      lastModified: song.lastModified,
      source: 'imported',
      importFormat: song.importFormat ?? 'unknown',
      fileName: song.fileName ?? file.name,
    };
  },

  async fetchImportedScoreFile(id: string): Promise<ArrayBuffer> {
    const token = authStorage.getToken();
    const response = await fetch(`${getApiBaseUrl()}/songs/${id}/score-file/`, {
      headers: token ? { Authorization: `Token ${token}` } : {},
    });
    if (!response.ok) {
      throw new Error('Failed to fetch score file');
    }
    return response.arrayBuffer();
  },

  async fetchGlobalChords(): Promise<Omit<GuitarSong['customChords'][number], 'isStandard'>[]> {
    return apiFetch('/global-chords/');
  },
};
