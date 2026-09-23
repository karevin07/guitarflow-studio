import { describe, expect, it } from 'vitest';
import { appPaths, parseAppRoute } from './routes';

describe('app routes', () => {
  it('maps root and song library URLs', () => {
    expect(parseAppRoute('/')).toEqual({ name: 'songs' });
    expect(parseAppRoute('/songs/')).toEqual({ name: 'songs' });
  });

  it('round-trips song workspace paths', () => {
    expect(parseAppRoute(appPaths.create('song 1'))).toEqual({ name: 'create', songId: 'song 1' });
    expect(parseAppRoute(appPaths.practice('42'))).toEqual({ name: 'practice', songId: '42' });
    expect(parseAppRoute(appPaths.arrange('42'))).toEqual({ name: 'arrange', songId: '42' });
  });

  it('round-trips chord symbols', () => {
    expect(parseAppRoute(appPaths.chords('F#m7'))).toEqual({ name: 'chords', symbol: 'F#m7' });
    expect(parseAppRoute('/unknown')).toEqual({ name: 'not-found' });
  });
});
