import { useState, useEffect, useCallback } from 'react';
import type { AlphaTabApi } from '@coderline/alphatab';
import { getImportedSongData } from '../services/importedSongsDb';

export const useImportedScore = (songId: string | null, onError: (message: string) => void) => {
  const [scoreData, setScoreData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(false);
  const [api, setApi] = useState<AlphaTabApi | null>(null);

  useEffect(() => {
    if (!songId) {
      setScoreData(null);
      setApi(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setApi(null);
    setScoreData(null);

    getImportedSongData(songId)
      .then(data => {
        if (cancelled) return;
        if (!data) {
          onError('Imported file not found in this browser.');
          return;
        }
        setScoreData(data);
      })
      .catch(() => {
        if (!cancelled) onError('Could not read imported file from storage.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [songId, onError]);

  const onApiReady = useCallback((nextApi: AlphaTabApi) => {
    setApi(nextApi);
  }, []);

  return { scoreData, loading, api, onApiReady };
};
