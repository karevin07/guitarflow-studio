import { describe, expect, it } from 'vitest';
import { GuitarSong, Setlist } from '../types';
import { libraryTags, matchesSearch, moveItem, parseTagInput, setlistPosition, setlistSongs } from './songInfo';

const song = (id: string, extra: Partial<GuitarSong> = {}): GuitarSong => ({
  id, title: `Song ${id}`, lastModified: 0, sections: [], customChords: [], voicingPlan: {}, transposeOffset: 0, ...extra,
} as GuitarSong);

describe('song info helpers', () => {
  it('searches title, artist and tags', () => {
    const item = song('1', { title: '小幸運', artist: '田馥甄', tags: ['抒情'] });
    expect(matchesSearch(item, '幸運')).toBe(true);
    expect(matchesSearch(item, '田馥')).toBe(true);
    expect(matchesSearch(item, '抒情')).toBe(true);
    expect(matchesSearch(item, '周杰倫')).toBe(false);
    expect(matchesSearch(song('2'), '  ')).toBe(true);
  });

  it('lists tags by use', () => {
    expect(libraryTags([song('1', { tags: ['民謠', '表演'] }), song('2', { tags: ['表演'] }), song('3')])).toEqual(['表演', '民謠']);
  });

  it('parses tag input with Chinese and English separators', () => {
    expect(parseTagInput('抒情, 表演，民謠、抒情,  ')).toEqual(['抒情', '表演', '民謠']);
  });

  it('orders setlist songs and skips deleted ones', () => {
    const songs = [song('1'), song('2'), song('3')];
    const setlist: Setlist = { id: 's', name: 'Gig', songIds: ['3', 'gone', '1', '2'], lastModified: 0 };
    expect(setlistSongs(setlist, songs).map(item => item.id)).toEqual(['3', '1', '2']);
    const position = setlistPosition(setlist, songs, '1');
    expect(position?.index).toBe(1);
    expect(position?.total).toBe(3);
    expect(position?.previous?.id).toBe('3');
    expect(position?.next?.id).toBe('2');
    expect(setlistPosition(setlist, songs, '3')?.previous).toBeNull();
    expect(setlistPosition(setlist, songs, 'x')).toBeNull();
  });

  it('moves items within bounds', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
  });
});
