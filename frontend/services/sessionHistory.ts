/**
 * Which songs this browser opened last and where playback stopped. Kept locally so the
 * library can offer "continue playing" without a backend change.
 */
const STORAGE_KEY = 'guitarflow-sessions';
const MAX_ENTRIES = 50;

export interface SongSession {
  openedAt: number;
  position?: {
    sectionTitle: string;
    /** 0-100 through the whole song. */
    percent: number;
  };
}

export type SessionMap = Record<string, SongSession>;

export const loadSessions = (): SessionMap => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed as SessionMap : {};
  } catch {
    return {};
  }
};

const saveSessions = (sessions: SessionMap) => {
  const trimmed = Object.fromEntries(
    Object.entries(sessions).sort((a, b) => b[1].openedAt - a[1].openedAt).slice(0, MAX_ENTRIES)
  );
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage can be full or blocked; the library simply falls back to edit dates.
  }
};

export const recordSongOpened = (songId: string, now = Date.now()): void => {
  const sessions = loadSessions();
  sessions[songId] = { ...sessions[songId], openedAt: now };
  saveSessions(sessions);
};

export const recordPlaybackPosition = (songId: string, sectionTitle: string, percent: number, now = Date.now()): void => {
  const sessions = loadSessions();
  sessions[songId] = {
    openedAt: sessions[songId]?.openedAt ?? now,
    position: { sectionTitle, percent: Math.max(0, Math.min(100, Math.round(percent))) },
  };
  saveSessions(sessions);
};

/** Songs ordered by when they were last opened here, then by last edit. */
export const sortByRecent = <T extends { id: string; lastModified: number }>(songs: T[], sessions: SessionMap): T[] =>
  [...songs].sort((a, b) =>
    (sessions[b.id]?.openedAt ?? 0) - (sessions[a.id]?.openedAt ?? 0) || b.lastModified - a.lastModified);
