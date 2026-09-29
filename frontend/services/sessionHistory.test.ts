import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSessions, recordPlaybackPosition, recordSongOpened, sortByRecent } from './sessionHistory';

describe('session history', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    });
  });

  it('remembers when songs were opened and where playback stopped', () => {
    recordSongOpened('9', 1000);
    recordPlaybackPosition('9', 'Chorus 1', 41.6, 2000);
    expect(loadSessions()['9']).toEqual({ openedAt: 1000, position: { sectionTitle: 'Chorus 1', percent: 42 } });
    recordSongOpened('9', 3000);
    expect(loadSessions()['9'].position?.sectionTitle).toBe('Chorus 1');
  });

  it('orders songs by last opened, then by last edit', () => {
    recordSongOpened('b', 5000);
    const songs = [{ id: 'a', lastModified: 9000 }, { id: 'b', lastModified: 1 }, { id: 'c', lastModified: 8000 }];
    expect(sortByRecent(songs, loadSessions()).map(song => song.id)).toEqual(['b', 'a', 'c']);
  });

  it('survives corrupted storage', () => {
    localStorage.setItem('guitarflow-sessions', '{not json');
    expect(loadSessions()).toEqual({});
  });
});
