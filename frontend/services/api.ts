import { GuitarSong, ImportedSong } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const parseJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
};

export const api = {
  async fetchSongs(): Promise<GuitarSong[]> {
    const response = await fetch(`${API_BASE_URL}/songs/?source=gflow`);
    if (!response.ok) {
      throw new Error('Failed to fetch songs');
    }
    const songs = await response.json();
    return songs.map((song: GuitarSong) => ({ ...song, source: 'gflow' as const }));
  },

  async fetchImportedScores(): Promise<ImportedSong[]> {
    const response = await fetch(`${API_BASE_URL}/songs/?source=imported`);
    if (!response.ok) {
      throw new Error('Failed to fetch imported scores');
    }
    const songs = await response.json();
    return songs.map((song: ImportedSong) => ({
      id: song.id,
      title: song.title,
      lastModified: song.lastModified,
      source: 'imported' as const,
      importFormat: song.importFormat ?? 'unknown',
      fileName: song.fileName ?? 'imported-score',
    }));
  },

  async getSong(id: string): Promise<GuitarSong> {
    const response = await fetch(`${API_BASE_URL}/songs/${id}/`);
    if (!response.ok) {
      throw new Error('Failed to fetch song');
    }
    return response.json();
  },

  async createSong(song: Omit<GuitarSong, 'id'>): Promise<GuitarSong> {
    const response = await fetch(`${API_BASE_URL}/songs/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(song),
    });
    if (!response.ok) {
      throw new Error('Failed to create song');
    }
    return response.json();
  },

  async updateSong(id: string, song: Omit<GuitarSong, 'id'>): Promise<GuitarSong> {
    const response = await fetch(`${API_BASE_URL}/songs/${id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(song),
    });
    if (!response.ok) {
      throw new Error('Failed to update song');
    }
    return response.json();
  },

  async updateImportedScoreTitle(id: string, title: string): Promise<ImportedSong> {
    const response = await fetch(`${API_BASE_URL}/songs/${id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        transposeOffset: 0,
        sections: [],
        customChords: [],
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to update imported score');
    }
    const song = await response.json();
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
    const response = await fetch(`${API_BASE_URL}/songs/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete song');
    }
  },

  async uploadImportedScore(file: File, title?: string): Promise<ImportedSong> {
    const formData = new FormData();
    formData.append('file', file);
    if (title?.trim()) formData.append('title', title.trim());

    const response = await fetch(`${API_BASE_URL}/songs/import-score/`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error('Failed to upload imported score');
    }

    const song = await parseJson<ImportedSong & { importFormat?: string; fileName?: string }>(response);
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
    const response = await fetch(`${API_BASE_URL}/songs/${id}/score-file/`);
    if (!response.ok) {
      throw new Error('Failed to fetch score file');
    }
    return response.arrayBuffer();
  },

  async fetchGlobalChords(): Promise<Omit<GuitarSong['customChords'][number], 'isStandard'>[]> {
    const response = await fetch(`${API_BASE_URL}/global-chords/`);
    if (!response.ok) {
      throw new Error('Failed to fetch global chords');
    }
    return response.json();
  },
};
