import { describe, expect, it } from 'vitest';
import { chordSheetToSong, displayWidth, evenColumns, parseChordSheet } from './chordSheetImport';

const at = (row: Array<string | null>) => Object.fromEntries(row.flatMap((value, col) => (value ? [[col, value]] : [])));

const TAIWAN_SHEET = [
  '給你一瓶魔法藥水',
  '原調：E 男調：E 女調：E',
  '拍速：100 拍號：4/4',
  'Capo: 4',
  '',
  '[前奏] |C  |E  |Am  |F  | x2',
  '',
  '|C         |E     |Am          |F   |',
  ' 給你一瓶  喝下去 就不需要氧氣',
  '|Dm7        |G    Gsus4-G |',
  ' ▲輕輕念著   你懂的咒語 (回▲)',
  '',
  '副歌：',
  'F          G',
  '宇宙的有趣 我才不在意',
].join('\n');

describe('displayWidth', () => {
  it('counts CJK as two columns', () => {
    expect(displayWidth('ab')).toBe(2);
    expect(displayWidth('喝下去')).toBe(6);
    expect(displayWidth('Am 愛')).toBe(5);
  });
});

describe('evenColumns', () => {
  it('places chords on beats', () => {
    expect(evenColumns(1)).toEqual([0]);
    expect(evenColumns(2)).toEqual([0, 8]);
    expect(evenColumns(3)).toEqual([0, 4, 8]);
    expect(evenColumns(4)).toEqual([0, 4, 8, 12]);
    expect(evenColumns(5)).toEqual([0, 3, 6, 9, 12]);
  });
});

describe('parseChordSheet: chords over lyrics', () => {
  const result = parseChordSheet(TAIWAN_SHEET);

  it('reads title, tempo and capo, skipping other metadata', () => {
    expect(result.format).toBe('chords-over-lyrics');
    expect(result.title).toBe('給你一瓶魔法藥水');
    expect(result.bpm).toBe(100);
    expect(result.capo).toBe(4);
  });

  it('splits sections by headers and blank lines, repeating x2 lines', () => {
    expect(result.sections.map(section => [section.title, section.bars.length])).toEqual([
      ['前奏', 8], ['段落 2', 6], ['副歌', 2],
    ]);
    expect(result.sections[0].bars.map(bar => bar.chords[0])).toEqual(['C', 'E', 'Am', 'F', 'C', 'E', 'Am', 'F']);
  });

  it('puts lyrics under the bar and chord they sit below', () => {
    const verse = result.sections[1].bars;
    expect(at(verse[0].chords)).toEqual({ 0: 'C' });
    expect(at(verse[0].lyrics)).toEqual({ 0: '給你一瓶' });
    expect(at(verse[1].lyrics)).toEqual({ 0: '喝下去' });
    expect(at(verse[2].lyrics)).toEqual({ 0: '就不需要氧氣' });
    expect(at(verse[3].chords)).toEqual({ 0: 'F' });
  });

  it('splits joined chords and drops repeat marks from lyrics', () => {
    const bar = result.sections[1].bars[5];
    expect(at(bar.chords)).toEqual({ 0: 'G', 4: 'Gsus4', 8: 'G' });
    expect(at(result.sections[1].bars[4].lyrics)).toEqual({ 0: '輕輕念著' });
    expect(Object.values(at(bar.lyrics)).join('')).not.toContain('▲');
  });

  it('treats each chord as a bar when there are no bar lines', () => {
    const chorus = result.sections[2].bars;
    expect(at(chorus[0].chords)).toEqual({ 0: 'F' });
    expect(at(chorus[0].lyrics)).toEqual({ 0: '宇宙的有趣' });
    expect(at(chorus[1].lyrics)).toEqual({ 0: '我才不在意' });
  });

  it('keeps unknown chords but reports them', () => {
    const odd = parseChordSheet('|Cmaj13  |G  |');
    expect(odd.sections[0].bars[0].chords[0]).toBe('Cmaj13');
    expect(odd.unknownChords).toEqual(['Cmaj13']);
  });
});

describe('parseChordSheet: ChordPro', () => {
  const result = parseChordSheet([
    '{title: Test Song}',
    '{tempo: 90}',
    '{capo: 2}',
    '{soc}',
    '[C]Somewhere [G]over the rainbow',
    '[Am]way up [F]high',
    '{c: Verse 2}',
    'Pickup [Dm7]line',
  ].join('\n'));

  it('reads directives and one bar per chord', () => {
    expect(result.format).toBe('chordpro');
    expect(result).toMatchObject({ title: 'Test Song', bpm: 90, capo: 2 });
    expect(result.sections.map(section => [section.title, section.bars.length])).toEqual([['Chorus', 4], ['Verse 2', 2]]);
    expect(at(result.sections[0].bars[1].chords)).toEqual({ 0: 'G' });
    expect(at(result.sections[0].bars[1].lyrics)).toEqual({ 0: 'over the rainbow' });
    expect(at(result.sections[1].bars[0].lyrics)).toEqual({ 0: 'Pickup' });
  });
});

describe('chordSheetToSong', () => {
  it('builds a lead sheet with an empty tab', () => {
    const song = chordSheetToSong(parseChordSheet(TAIWAN_SHEET), ' 魔法 ');
    expect(song.title).toBe('魔法');
    expect(song.bpm).toBe(100);
    expect(song.sections[0]).toMatchObject({ title: '前奏', capo: 4, timeSignature: [4, 4] });
    expect(song.sections[0].measures).toHaveLength(8);
    expect(song.sections[0].measures[0].flat().every(cell => cell === '-')).toBe(true);
  });
});
