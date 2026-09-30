import { useState, useCallback } from 'react';
import { ImportedSong } from '../types';
import { api } from '../services/api';
import { isGuitarProFile } from '../services/gpImport';

interface UseImportedSongsOptions {
  onSongOpened: (song: ImportedSong) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export const useImportedSongs = ({ onSongOpened, onError, onSuccess }: UseImportedSongsOptions) => {
  const [songs, setSongs] = useState<ImportedSong[]>([]);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const loaded = await api.fetchImportedScores();
      setSongs(loaded);
    } catch {
      onError('Could not load imported Guitar Pro files from the server.');
    }
  }, [onError]);

  const importFile = useCallback(
    async (file: File, title?: string) => {
      if (!isGuitarProFile(file.name)) {
        onError('Unsupported file type. Please choose a Guitar Pro or MusicXML file.');
        return;
      }
      try {
        const song = await api.uploadImportedScore(file, title);
        setSongs(prev => [song, ...prev.filter(s => s.id !== song.id)]);
        setCurrentSongId(song.id);
        onSongOpened(song);
        onSuccess(`Imported "${song.title}" from ${song.importFormat.toUpperCase()}.`);
        return song;
      } catch {
        onError('Failed to import file. The file may be corrupted or the server is unavailable.');
        return null;
      }
    },
    [onError, onSuccess, onSongOpened]
  );

  const openSong = useCallback(
    (song: ImportedSong) => {
      setCurrentSongId(song.id);
      onSongOpened(song);
    },
    [onSongOpened]
  );

  const deleteSong = useCallback(
    async (id: string) => {
      try {
        await api.deleteSong(id);
        setSongs(prev => prev.filter(s => s.id !== id));
        if (currentSongId === id) setCurrentSongId(null);
        onSuccess('Imported score deleted.');
      } catch {
        onError('Failed to delete imported score.');
      }
    },
    [currentSongId, onError, onSuccess]
  );

  const updateTitle = useCallback(
    async (id: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      try {
        const updated = await api.updateImportedScoreTitle(id, trimmed);
        setSongs(prev => prev.map(s => (s.id === id ? updated : s)));
      } catch {
        onError('Failed to update imported score title.');
      }
    },
    [onError]
  );

  return {
    songs,
    setSongs,
    currentSongId,
    refresh,
    importFile,
    openSong,
    deleteSong,
    updateTitle,
  };
};
