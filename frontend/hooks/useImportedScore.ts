import { useState, useEffect, useCallback } from 'react';
import type { AlphaTabApi } from '@coderline/alphatab';
import { api as songApi } from '../services/api';

export const useImportedScore = (songId: string | null, onError: (message: string) => void) => {
  const [scoreData, setScoreData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(false);
  const [alphaTabApi, setAlphaTabApi] = useState<AlphaTabApi | null>(null);

  useEffect(() => {
    if (!songId) {
      setScoreData(null);
      setAlphaTabApi(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setAlphaTabApi(null);
    setScoreData(null);

    songApi.fetchImportedScoreFile(songId)
      .then(data => {
        if (cancelled) return;
        if (!data || data.byteLength === 0) {
          onError('Imported file not found on the server.');
          return;
        }
        setScoreData(data);
      })
      .catch(() => {
        if (!cancelled) onError('Could not download imported score from the server.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [songId, onError]);

  const onApiReady = useCallback((nextApi: AlphaTabApi) => {
    setAlphaTabApi(nextApi);
  }, []);

  return { scoreData, loading, api: alphaTabApi, onApiReady };
};
