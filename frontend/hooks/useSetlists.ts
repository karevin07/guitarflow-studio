import { useCallback, useEffect, useState } from 'react';
import { Setlist } from '../types';
import { api } from '../services/api';

/** The signed-in user's setlists, loaded when `enabled` turns true. */
export const useSetlists = (enabled: boolean, onError: (message: string) => void) => {
  const [setlists, setSetlists] = useState<Setlist[]>([]);

  useEffect(() => {
    if (!enabled) {
      setSetlists([]);
      return;
    }
    let cancelled = false;
    api.fetchSetlists()
      .then(loaded => { if (!cancelled) setSetlists(loaded); })
      .catch(() => { if (!cancelled) onError('無法載入歌單。'); });
    return () => { cancelled = true; };
  }, [enabled, onError]);

  const save = useCallback(async (id: string | null, changes: Pick<Setlist, 'name' | 'songIds'>) => {
    try {
      const saved = id ? await api.updateSetlist(id, changes) : await api.createSetlist(changes);
      setSetlists(prev => [saved, ...prev.filter(item => item.id !== saved.id)]);
      return saved;
    } catch {
      onError('儲存歌單失敗，請稍後再試。');
      return null;
    }
  }, [onError]);

  const remove = useCallback(async (id: string) => {
    try {
      await api.deleteSetlist(id);
      setSetlists(prev => prev.filter(item => item.id !== id));
      return true;
    } catch {
      onError('刪除歌單失敗，請稍後再試。');
      return false;
    }
  }, [onError]);

  return { setlists, save, remove };
};
