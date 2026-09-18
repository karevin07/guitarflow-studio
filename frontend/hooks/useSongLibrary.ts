import { useState, useCallback } from 'react';
import { GuitarSong, TabSection, ChordDefinition } from '../types';
import { api } from '../services/api';

interface UseSongLibraryOptions {
  onSongOpened: (
    title: string,
    sections: TabSection[],
    customChords: ChordDefinition[],
    transposeOffset: number
  ) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export const useSongLibrary = ({ onSongOpened, onError, onSuccess }: UseSongLibraryOptions) => {
  const [songs, setSongs] = useState<GuitarSong[]>([]);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const fetchSongs = useCallback(async () => {
    try {
      const loaded = await api.fetchSongs();
      setSongs(loaded);
    } catch {
      onError('Could not load your library. Is the backend running?');
    }
  }, [onError]);

  const createNewSong = useCallback(
    async (initialSongData: Omit<GuitarSong, 'id' | 'lastModified'>) => {
      try {
        const newSong = await api.createSong(initialSongData as Omit<GuitarSong, 'id'>);
        setSongs(prev => [newSong, ...prev]);
        setCurrentSongId(newSong.id);
        onSongOpened(newSong.title, newSong.sections, newSong.customChords || [], newSong.transposeOffset || 0);
        return newSong;
      } catch {
        onError('Failed to create song. Please try again.');
        return null;
      }
    },
    [onSongOpened, onError]
  );

  const openSong = useCallback(
    (song: GuitarSong) => {
      setCurrentSongId(song.id);
      onSongOpened(song.title, song.sections, song.customChords || [], song.transposeOffset || 0);
    },
    [onSongOpened]
  );

  const deleteSong = useCallback(
    async (id: string) => {
      try {
        await api.deleteSong(id);
        setSongs(prev => prev.filter(s => s.id !== id));
        if (currentSongId === id) setCurrentSongId(null);
        onSuccess('Song deleted.');
      } catch {
        onError('Failed to delete song.');
      }
    },
    [currentSongId, onError, onSuccess]
  );

  const saveCurrentSong = useCallback(
    async (songData: { title: string; sections: TabSection[]; customChords: ChordDefinition[]; transposeOffset: number }) => {
      if (!currentSongId) return;
      setSaveStatus('saving');
      try {
        const saved = await api.updateSong(currentSongId, songData as Omit<GuitarSong, 'id'>);
        setSongs(prev => prev.map(s => (s.id === currentSongId ? saved : s)));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('idle');
        onError('Failed to save. Check your connection and try again.');
      }
    },
    [currentSongId, onError]
  );

  const importSong = useCallback(
    async (songData: Omit<GuitarSong, 'id' | 'lastModified'>) => {
      try {
        const newSong = await api.createSong(songData as Omit<GuitarSong, 'id'>);
        setSongs(prev => [newSong, ...prev]);
        setCurrentSongId(newSong.id);
        onSongOpened(newSong.title, newSong.sections, newSong.customChords || [], newSong.transposeOffset || 0);
        onSuccess(`Imported "${newSong.title}" successfully.`);
        return newSong;
      } catch {
        onError('Failed to import song. Please try again.');
        return null;
      }
    },
    [onSongOpened, onError, onSuccess]
  );

  return {
    songs, setSongs,
    currentSongId,
    saveStatus,
    fetchSongs,
    createNewSong,
    openSong,
    deleteSong,
    saveCurrentSong,
    importSong,
  };
};
