const storageKey = (songId: string) => `guitarflow-tracks-${songId}`;

export const loadTrackPrefs = (songId: string): number[] | null => {
  try {
    const raw = localStorage.getItem(storageKey(songId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((n): n is number => typeof n === 'number' && Number.isInteger(n));
  } catch {
    return null;
  }
};

export const saveTrackPrefs = (songId: string, indexes: number[]): void => {
  localStorage.setItem(storageKey(songId), JSON.stringify(indexes));
};

export const defaultTrackSelection = (trackCount: number): number[] => {
  if (trackCount <= 0) return [];
  return [0];
};
