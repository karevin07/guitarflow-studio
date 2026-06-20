import { useState, useEffect, useCallback } from 'react';
import type { AlphaTabApi } from '@coderline/alphatab';
import { AlphaTabTrackInfo } from '../types/alphatab';
import { defaultTrackSelection, loadTrackPrefs, saveTrackPrefs } from '../services/importedTrackPrefs';

export const useAlphaTabTracks = (api: AlphaTabApi | null, songId: string | null) => {
  const [tracks, setTracks] = useState<AlphaTabTrackInfo[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  const applyRender = useCallback(
    (indexes: number[]) => {
      if (!api?.score || indexes.length === 0) return;
      const trackObjs = indexes
        .map(i => api.score!.tracks[i])
        .filter((t): t is NonNullable<typeof t> => !!t);
      if (trackObjs.length === 0) return;
      api.stop();
      api.renderTracks(trackObjs);
    },
    [api]
  );

  useEffect(() => {
    if (!api || !songId) {
      setTracks([]);
      setSelected([]);
      return;
    }

    const syncFromScore = () => {
      const score = api.score;
      if (!score?.tracks?.length) return;

      const list: AlphaTabTrackInfo[] = score.tracks.map((t, index) => ({
        index,
        name: (t.name || t.shortName || `Track ${index + 1}`).trim(),
        shortName: (t.shortName || t.name || `T${index + 1}`).trim(),
        isPercussion: t.isPercussion,
      }));

      setTracks(list);

      const saved = loadTrackPrefs(songId);
      const validSaved = saved?.filter(i => i >= 0 && i < list.length) ?? [];
      const initial = validSaved.length > 0 ? validSaved : defaultTrackSelection(list.length);
      setSelected(initial);
      applyRender(initial);
    };

    api.scoreLoaded.on(syncFromScore);
    if (api.score) syncFromScore();

    return () => {
      api.scoreLoaded.off(syncFromScore);
    };
  }, [api, songId, applyRender]);

  useEffect(() => {
    if (!songId || selected.length === 0) return;
    saveTrackPrefs(songId, selected);
  }, [songId, selected]);

  const toggleTrack = useCallback(
    (index: number) => {
      setSelected(prev => {
        const has = prev.includes(index);
        if (has && prev.length === 1) return prev;
        const next = has ? prev.filter(i => i !== index) : [...prev, index].sort((a, b) => a - b);
        applyRender(next);
        return next;
      });
    },
    [applyRender]
  );

  const selectAll = useCallback(() => {
    const all = tracks.map(t => t.index);
    setSelected(all);
    applyRender(all);
  }, [tracks, applyRender]);

  const selectGuitarTracks = useCallback(() => {
    const guitar = tracks.filter(t => !t.isPercussion).map(t => t.index);
    const next = guitar.length > 0 ? guitar : defaultTrackSelection(tracks.length);
    setSelected(next);
    applyRender(next);
  }, [tracks, applyRender]);

  return {
    tracks,
    selected,
    toggleTrack,
    selectAll,
    selectGuitarTracks,
  };
};
