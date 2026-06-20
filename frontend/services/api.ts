import { GuitarSong } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

export const api = {
  async fetchSongs(): Promise<GuitarSong[]> {
    const response = await fetch(`${API_BASE_URL}/songs/`);
    if (!response.ok) {
      throw new Error('Failed to fetch songs');
    }
    return response.json();
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

  async deleteSong(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/songs/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete song');
    }
  },
};
