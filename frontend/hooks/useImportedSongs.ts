import { useState, useCallback, useEffect } from 'react';
import { ImportedSong } from '../types';
import {
  deleteImportedSong,
  listImportedSongs,
  saveImportedSong,
} from '../services/importedSongsDb';
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
      const loaded = await listImportedSongs();
      setSongs(loaded);
    } catch {
      onError('Could not load imported Guitar Pro files from this browser.');
    }
  }, [onError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const importFile = useCallback(
    async (file: File) => {
      if (!isGuitarProFile(file.name)) {
        onError('Unsupported file type. Please choose a Guitar Pro or MusicXML file.');
        return;
      }
      try {
        const song = await saveImportedSong(file);
        setSongs(prev => [song, ...prev.filter(s => s.id !== song.id)]);
        setCurrentSongId(song.id);
        onSongOpened(song);
        onSuccess(`Imported "${song.title}" from ${song.importFormat.toUpperCase()}.`);
      } catch {
        onError('Failed to import file. The file may be corrupted or too large.');
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
        await deleteImportedSong(id);
        setSongs(prev => prev.filter(s => s.id !== id));
        if (currentSongId === id) setCurrentSongId(null);
        onSuccess('Imported score removed from this browser.');
      } catch {
        onError('Failed to delete imported score.');
      }
    },
    [currentSongId, onError, onSuccess]
  );

  return {
    songs,
    currentSongId,
    refresh,
    importFile,
    openSong,
    deleteSong,
  };
};
