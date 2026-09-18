export type AppRoute =
  | { name: 'songs' }
  | { name: 'create'; songId: string }
  | { name: 'practice'; songId: string }
  | { name: 'chords'; symbol: string | null }
  | { name: 'not-found' };

const decodeSegment = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const parseAppRoute = (pathname: string): AppRoute => {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  if (cleanPath === '/' || cleanPath === '/songs') return { name: 'songs' };
  if (cleanPath === '/chords') return { name: 'chords', symbol: null };

  const chordMatch = cleanPath.match(/^\/chords\/([^/]+)$/);
  if (chordMatch) return { name: 'chords', symbol: decodeSegment(chordMatch[1]) };

  const songMatch = cleanPath.match(/^\/songs\/([^/]+)\/(create|practice)$/);
  if (songMatch) {
    return {
      name: songMatch[2] as 'create' | 'practice',
      songId: decodeSegment(songMatch[1]),
    };
  }

  return { name: 'not-found' };
};

export const appPaths = {
  songs: '/songs',
  create: (songId: string) => `/songs/${encodeURIComponent(songId)}/create`,
  practice: (songId: string) => `/songs/${encodeURIComponent(songId)}/practice`,
  chords: (symbol?: string | null) => symbol ? `/chords/${encodeURIComponent(symbol)}` : '/chords',
};
