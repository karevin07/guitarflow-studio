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

describe('song info and patterns in chord sheets', () => {
  it('reads artist, original key and strum patterns per section', () => {
    const result = parseChordSheet(`小幸運
歌手：田馥甄  作詞：徐世珍
原調：E  Capo：4  Play：C
刷法：↓ ↓↑ -↑ ↓↑

[主歌]
|C          |G          |
 我聽見雨滴  落在青青草地

副歌 指法：T1 21 31 21
|F          |G          |
 原來你是    我最想留住的幸運

|Am         |F          |
 原來我們    和愛情曾經靠得那麼近`);
    expect(result.artist).toBe('田馥甄');
    expect(result.originalKey).toBe('E');
    expect(result.capo).toBe(4);
    expect(result.sections.map(section => [section.title, section.pattern])).toEqual([
      ['主歌', '↓ ↓↑ -↑ ↓↑'],
      ['副歌', 'T1 21 31 21'],
      // A new block after a blank line keeps the pattern in use.
      ['段落 3', 'T1 21 31 21'],
    ]);
    expect(result.unknownPatterns).toEqual([]);

    const song = chordSheetToSong(result, result.title);
    expect(song.artist).toBe('田馥甄');
    expect(song.originalKey).toBe('E');
    expect(song.sections[1].pattern).toBe('T1 21 31 21');
  });

  it('lists pattern lines it cannot read', () => {
    const result = parseChordSheet(`刷法：↓↓↑↑↓↑V
|C |G |`);
    expect(result.unknownPatterns).toEqual(['↓↓↑↑↓↑V']);
    expect(result.sections[0].pattern).toBe('');
  });

  it('reads ChordPro artist and key', () => {
    const result = parseChordSheet(`{title: Song}
{artist: Someone}
{key: G}
{x_strum: D DU -U DU}
{sov}
[G]Hello [C]world`);
    expect(result.artist).toBe('Someone');
    expect(result.originalKey).toBe('G');
    expect(result.sections[0].pattern).toBe('D DU -U DU');
  });
});

describe('play order from chord sheets', () => {
  const sheet = `歌
[前奏] |C |G |

主歌
|C          |G          |
 第一句      第二句

副歌 x2
|F          |G          |
 副歌一      副歌二

回主歌

[副歌]

尾奏
|C |`;

  it('writes repeated sections once and records the order', () => {
    const result = parseChordSheet(sheet);
    expect(result.sections.map(section => section.title)).toEqual(['前奏', '主歌', '副歌', '尾奏']);
    expect(result.form).toEqual([
      { section: 0, repeat: 1 },
      { section: 1, repeat: 1 },
      { section: 2, repeat: 2 },
      { section: 1, repeat: 1 },
      { section: 2, repeat: 1 },
      { section: 3, repeat: 1 },
    ]);
    expect(chordSheetToSong(result, 'x').form).toEqual(result.form);
  });

  it('leaves the order empty when sections play once each', () => {
    expect(parseChordSheet(`主歌\n|C |G |\n\n副歌\n|F |G |`).form).toEqual([]);
  });

  it('keeps bar repeats on chord lines and new sections with the same name', () => {
    const result = parseChordSheet(`主歌\n|C |G | x2\n\n主歌 2\n|Am |F |`);
    expect(result.sections.map(section => section.bars.length)).toEqual([4, 2]);
    expect(result.form).toEqual([]);
  });

  it('plays {chorus} again in ChordPro', () => {
    const result = parseChordSheet(`{sov}\n[C]Verse\n{eov}\n{soc}\n[F]Chorus\n{eoc}\n{sov}\n[G]Verse two\n{chorus}`);
    expect(result.sections.map(section => section.title)).toEqual(['Verse', 'Chorus', 'Verse']);
    expect(result.form).toEqual([
      { section: 0, repeat: 1 }, { section: 1, repeat: 1 }, { section: 2, repeat: 1 }, { section: 1, repeat: 1 },
    ]);
  });
});
