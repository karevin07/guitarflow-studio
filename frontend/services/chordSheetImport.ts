import { parseChord } from '../music-theory';
import { parsePattern } from './accompaniment';
import { GuitarSong, TabSection } from '../types';

/**
 * Turn a pasted chord sheet into song sections. Two formats are understood:
 *  - chords written above lyrics, optionally with `|` bar lines (common on Taiwanese chord sites)
 *  - ChordPro: `[C]lyrics [G]more`, `{title: ...}`, `{soc}`, `{c: Verse}`
 * Without bar lines every chord starts a new bar; within a bar chords are spaced evenly.
 */

const COLS = 16;

export interface ImportedBar {
  chords: Array<string | null>;
  lyrics: Array<string | null>;
}

export interface ImportedSection {
  title: string;
  /** Strum or picking pattern from a 刷法 / 指法 line; empty when the sheet has none. */
  pattern: string;
  bars: ImportedBar[];
}

export interface ChordSheetResult {
  title: string;
  artist: string;
  originalKey: string;
  bpm: number | null;
  capo: number;
  format: 'chords-over-lyrics' | 'chordpro';
  sections: ImportedSection[];
  /** Chord-like tokens the chord parser does not know; they are kept as written. */
  unknownChords: string[];
  /** 刷法 / 指法 lines that could not be read as a pattern. */
  unknownPatterns: string[];
  /** Play order over `sections` when the sheet repeats or revisits sections; empty means as written. */
  form: Array<{ section: number; repeat: number }>;
}

const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦　]/;

/** Display width in a monospace layout: CJK and full-width characters take two columns. */
export const displayWidth = (text: string): number => [...text].reduce((width, char) => width + (WIDE.test(char) ? 2 : 1), 0);

const CHORD_SHAPE = /^[A-G](?:#|b)?[A-Za-z0-9#b+°ø()]*(?:\/[A-G](?:#|b)?)?$/;
const REPEAT = /^[xX×＊*]\s*(\d)$/;

const looksLikeChord = (token: string) => CHORD_SHAPE.test(token);

/** "Gsus4-G" is two chords on one beat group; split joined chords. */
const splitJoined = (token: string): string[] => {
  const parts = token.split('-');
  return parts.length > 1 && parts.every(looksLikeChord) ? parts : [token];
};

interface PositionedToken {
  text: string;
  col: number;
}

const tokenize = (line: string): PositionedToken[] => {
  const tokens: PositionedToken[] = [];
  let col = 0;
  let current = '';
  let start = 0;
  const flush = () => {
    if (current) tokens.push({ text: current, col: start });
    current = '';
  };
  for (const char of line) {
    if (char === '|' || char === '｜') {
      flush();
      tokens.push({ text: '|', col });
    } else if (/\s/.test(char)) {
      flush();
    } else {
      if (!current) start = col;
      current += char;
    }
    col += WIDE.test(char) ? 2 : 1;
  }
  flush();
  return tokens;
};

/** A line made (almost) only of chords, bar lines and repeat marks. */
const isChordLine = (line: string): boolean => {
  const tokens = tokenize(line).filter(token => token.text !== '|' && !/^[:：]+$/.test(token.text));
  if (tokens.length === 0) return /\|/.test(line);
  const chordish = tokens.filter(token => REPEAT.test(token.text) || splitJoined(token.text.replace(/^[:：]|[:：]$/g, '')).every(looksLikeChord));
  return chordish.length > 0 && chordish.length / tokens.length >= 0.75;
};

const SECTION_WORDS = /^(前奏|間奏|尾奏|主歌|副歌|橋段|過門|結尾|intro|verse|chorus|pre-?chorus|bridge|interlude|outro|solo|ending|tag|hook)\s*\d*$/i;

/** "[前奏] |C |E" → header "前奏" plus the rest of the line. */
const splitHeader = (line: string): { header: string; rest: string } | null => {
  const trimmed = line.trim();
  const bracket = trimmed.match(/^[[【(（]\s*([^\]】)）]{1,16})\s*[\]】)）]\s*(.*)$/);
  if (bracket && !looksLikeChord(bracket[1])) return { header: bracket[1].trim(), rest: bracket[2] };
  const colon = trimmed.match(/^([^\s:：|]{1,12}(?:\s\d)?)\s*[:：]\s*(.*)$/);
  if (colon && (SECTION_WORDS.test(colon[1]) || colon[2] === '' || isChordLine(colon[2]))) {
    if (!META_KEYS.test(colon[1])) return { header: colon[1].trim(), rest: colon[2] };
  }
  if (SECTION_WORDS.test(trimmed)) return { header: trimmed, rest: '' };
  return null;
};

const META_KEYS = /^(拍速|速度|tempo|bpm|capo|key|play|原調|男調|女調|拍號|指法|刷法|歌手|演唱|原唱|作詞|作曲|詞|曲|編曲|詞\/曲|artist|singer|title)/i;

interface Meta {
  bpm?: number;
  capo?: number;
  artist?: string;
  originalKey?: string;
}

const ARTIST = /(?:歌手|演唱|原唱|artist|singer)\s*[:：]\s*(.+)$/i;

/** The value after "歌手：", up to a wide gap or the next "作詞：" style field. */
const readArtist = (line: string): string | undefined => {
  const match = line.match(ARTIST);
  if (!match) return undefined;
  const value = match[1].split(/\s{2,}|\s*[|｜/]\s*|\s+(?=[^\s:：]{1,6}\s*[:：])/)[0].trim();
  return value || undefined;
};

const PATTERN_LINE = /(刷法|指法|節奏|rhythm|strum(?:ming)?|pattern)\s*[:：]\s*(.+)$/i;

/** "副歌 刷法：↓ ↓↑ -↑ ↓↑" → { prefix: '副歌', text: '↓ ↓↑ -↑ ↓↑' }. */
const splitPatternLine = (line: string): { prefix: string; text: string } | null => {
  const match = line.match(PATTERN_LINE);
  if (!match || match.index === undefined) return null;
  return { prefix: line.slice(0, match.index).trim(), text: match[2].trim() };
};

/** Tempo and capo lines; other metadata lines (key, singer, writers) are recognised and skipped. */
const readMeta = (line: string): Meta | null => {
  const trimmed = line.trim();
  if (!META_KEYS.test(trimmed) && !/(原調|男調|女調|拍速|Capo)/i.test(trimmed)) return null;
  const meta: Meta = {};
  const bpm = trimmed.match(/(?:拍速|速度|tempo|bpm)\s*[:：=]?\s*(\d{2,3})/i);
  if (bpm) meta.bpm = Number(bpm[1]);
  const capo = trimmed.match(/capo\s*[:：=]?\s*(\d{1,2})/i);
  if (capo) meta.capo = Number(capo[1]);
  const key = trimmed.match(/(?:原調|key)\s*[:：=]?\s*([A-G][#b]?m?)(?![a-z])/i);
  if (key) meta.originalKey = key[1];
  const artist = readArtist(trimmed);
  if (artist) meta.artist = artist;
  return meta;
};

/** "副歌 x2" → { text: '副歌', repeat: 2 }. */
const splitRepeat = (text: string): { text: string; repeat: number } => {
  const match = text.match(/^(.*?)\s*[xX×＊*]\s*(\d)\s*$/);
  return match && match[1].trim() ? { text: match[1].trim(), repeat: Math.max(1, Math.min(8, Number(match[2]))) } : { text: text.trim(), repeat: 1 };
};

/** "回副歌", "(重複副歌)", "Repeat Chorus x2" → the section name to play again. */
const JUMP = /^[(（]?\s*(?:回到?|重複|反覆|repeat)\s*[:：]?\s*([^()（）▲★☆●◆]+?)\s*[)）]?$/i;

interface Play {
  section: ImportedSection;
  repeat: number;
}

const findSection = (sections: ImportedSection[], name: string): ImportedSection | undefined => {
  const wanted = name.trim().toLowerCase();
  return sections.find(section => section.title.toLowerCase() === wanted)
    ?? sections.find(section => section.title.toLowerCase().startsWith(wanted) || wanted.startsWith(section.title.toLowerCase()));
};

/** The play order over the kept sections, or [] when it is just each section once, in order. */
const formFor = (plays: Play[], kept: ImportedSection[]): Array<{ section: number; repeat: number }> => {
  const form = plays
    .map(play => ({ section: kept.indexOf(play.section), repeat: play.repeat }))
    .filter(entry => entry.section >= 0);
  const plain = form.length === kept.length && form.every((entry, index) => entry.section === index && entry.repeat === 1);
  return plain ? [] : form;
};

const cleanLyric = (text: string) => text
  .replace(/[（(](?:回\s*)?[▲★☆●◆]?[）)]|[（(]\s*end\s*[）)]/gi, '')
  .replace(/[▲★☆●◆]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

/** Where chords sit in a bar: 1 → beat 1, 2 → beats 1 and 3, 3–4 → one per beat, more → evenly. */
export const evenColumns = (count: number): number[] => {
  if (count <= 1) return [0];
  if (count === 2) return [0, 8];
  if (count <= 4) return Array.from({ length: count }, (_, index) => index * 4);
  const step = Math.floor(COLS / count);
  return Array.from({ length: count }, (_, index) => index * step);
};

const emptyRow = () => Array<string | null>(COLS).fill(null);

interface Segment {
  start: number;
  end: number;
  chords: PositionedToken[];
}

/** Build bars from a chord line and the lyric line under it (either may be empty). */
const barsFromPair = (chordLine: string, lyricLine: string, unknown: Set<string>): ImportedBar[] => {
  const tokens = tokenize(chordLine);
  let repeat = 1;
  const chordTokens: PositionedToken[] = [];
  const bars: number[] = [];
  tokens.forEach(token => {
    if (token.text === '|') {
      bars.push(token.col);
      return;
    }
    const repeatMatch = token.text.match(REPEAT);
    if (repeatMatch) {
      repeat = Number(repeatMatch[1]);
      return;
    }
    const cleaned = token.text.replace(/^[:：]+|[:：]+$/g, '');
    if (!cleaned) return;
    splitJoined(cleaned).forEach((chord, index) => {
      chordTokens.push({ text: chord, col: token.col + index * 0.01 });
      if (!parseChord(chord)) unknown.add(chord);
    });
  });

  const lineEnd = Math.max(displayWidth(chordLine), displayWidth(lyricLine)) + 1;
  let segments: Segment[];
  if (bars.length > 0) {
    const edges = [0, ...bars, lineEnd];
    segments = [];
    for (let index = 0; index < edges.length - 1; index += 1) {
      const start = edges[index];
      const end = edges[index + 1];
      const chords = chordTokens.filter(token => token.col >= start && token.col < end);
      // Skip the empty stretch before the first bar line and after the last one.
      const outer = index === 0 || index === edges.length - 2;
      if (outer && chords.length === 0) continue;
      if (end - start <= 1 && chords.length === 0) continue;
      segments.push({ start, end, chords });
    }
  } else if (chordTokens.length > 0) {
    // No bar lines: every chord starts its own bar.
    segments = chordTokens.map((token, index) => ({
      start: index === 0 ? 0 : token.col,
      end: chordTokens[index + 1]?.col ?? lineEnd,
      chords: [token],
    }));
  } else {
    segments = [{ start: 0, end: lineEnd, chords: [] }];
  }
  if (segments.length === 0) segments = [{ start: 0, end: lineEnd, chords: [] }];

  // Lyric characters by display column.
  const lyricChars: Array<{ char: string; col: number }> = [];
  let col = 0;
  for (const char of lyricLine) {
    lyricChars.push({ char, col });
    col += WIDE.test(char) ? 2 : 1;
  }
  const segmentFor = (position: number) => {
    const found = segments.findIndex(segment => position >= segment.start && position < segment.end);
    if (found >= 0) return found;
    return position < segments[0].start ? 0 : segments.length - 1;
  };

  const built = segments.map(segment => {
    const chords = emptyRow();
    const lyrics = emptyRow();
    const columns = evenColumns(segment.chords.length);
    segment.chords.forEach((token, index) => { chords[columns[index]] = token.text; });
    // Lyric text belongs to the chord it sits under (text before the first chord joins it).
    const pieces = segment.chords.length > 0 ? segment.chords.map(() => '') : [''];
    lyricChars.filter(item => segmentFor(item.col) === segments.indexOf(segment)).forEach(item => {
      let owner = 0;
      segment.chords.forEach((token, index) => { if (item.col >= token.col) owner = index; });
      pieces[owner] += item.char;
    });
    pieces.forEach((piece, index) => {
      const text = cleanLyric(piece);
      if (text) lyrics[segment.chords.length > 0 ? columns[index] : 0] = text;
    });
    return { chords, lyrics };
  });

  const repeated: ImportedBar[] = [];
  for (let pass = 0; pass < repeat; pass += 1) built.forEach(bar => repeated.push({ chords: [...bar.chords], lyrics: [...bar.lyrics] }));
  return repeated;
};

const isChordPro = (text: string) =>
  /\{\s*(title|t|soc|start_of_chorus|sov|start_of_verse|c|comment)\s*[:}]/i.test(text)
  || text.split('\n').filter(line => /\[[A-G][^\]\s]{0,8}\]/.test(line)).length >= 2;

/** Reads 刷法 / 指法 lines and remembers the pattern so later sections keep it. */
const patternTracker = (unknownPatterns: Set<string>) => {
  let active = '';
  return {
    get active() { return active; },
    /** Returns true when the text was a readable pattern. */
    apply(text: string, section: ImportedSection | null) {
      const parsed = parsePattern(text);
      if (!parsed.ok) {
        unknownPatterns.add(text);
        return false;
      }
      active = text.trim().split(/\s+/).join(' ');
      if (section) section.pattern = active;
      return true;
    },
  };
};

type ParsedBody = Omit<ChordSheetResult, 'unknownChords' | 'unknownPatterns' | 'format'>;

const parseChordPro = (text: string, unknown: Set<string>, unknownPatterns: Set<string>): ParsedBody => {
  let title = '';
  let artist = '';
  let originalKey = '';
  let bpm: number | null = null;
  let capo = 0;
  const sections: ImportedSection[] = [];
  const plays: Play[] = [];
  let current: ImportedSection | null = null;
  let lastChorus: ImportedSection | null = null;
  const patterns = patternTracker(unknownPatterns);
  const open = (name: string) => {
    current = { title: name, pattern: patterns.active, bars: [] };
    sections.push(current);
    plays.push({ section: current, repeat: 1 });
  };

  text.split('\n').forEach(raw => {
    const line = raw.trim();
    const directive = line.match(/^\{\s*([a-z_]+)\s*(?::\s*(.*?))?\s*\}$/i);
    if (directive) {
      const [, name, value = ''] = directive;
      const key = name.toLowerCase();
      if (key === 'title' || key === 't') title = value;
      else if (key === 'artist' || key === 'a') artist = value;
      else if (key === 'key') originalKey = value;
      else if (key === 'x_pattern' || key === 'x_strum') patterns.apply(value, current);
      else if (key === 'tempo') bpm = Number(value) || bpm;
      else if (key === 'capo') capo = Number(value) || 0;
      else if (key === 'soc' || key === 'start_of_chorus') {
        open(value || 'Chorus');
        lastChorus = current;
      } else if (key === 'chorus') {
        // {chorus} plays the last chorus again.
        const target = (value && findSection(sections, value)) || lastChorus;
        if (target) {
          plays.push({ section: target, repeat: 1 });
          current = null;
        }
      }
      else if (key === 'sov' || key === 'start_of_verse') open(value || 'Verse');
      else if (key === 'sob' || key === 'start_of_bridge') open(value || 'Bridge');
      else if (key === 'c' || key === 'comment' || key === 'ci') open(value || '段落');
      return;
    }
    if (!line) return;
    const patternLine = !/\[/.test(line) ? splitPatternLine(line) : null;
    if (patternLine) {
      if (patternLine.prefix) open(patternLine.prefix);
      patterns.apply(patternLine.text, current);
      return;
    }
    const header = splitHeader(line);
    if (header && !/\[/.test(line)) {
      open(header.header);
      return;
    }
    if (!current) open('段落 1');
    // Each [Chord] starts a new bar; text before the first chord is a pickup in its own bar.
    const parts = line.split(/(\[[^\]]+\])/).filter(Boolean);
    let pending: ImportedBar | null = null;
    parts.forEach(part => {
      const chordMatch = part.match(/^\[([^\]]+)\]$/);
      if (chordMatch) {
        pending = { chords: emptyRow(), lyrics: emptyRow() };
        const chord = chordMatch[1].trim();
        pending.chords[0] = chord;
        if (!parseChord(chord)) unknown.add(chord);
        current!.bars.push(pending);
        return;
      }
      const lyric = cleanLyric(part);
      if (!lyric) return;
      if (!pending) {
        pending = { chords: emptyRow(), lyrics: emptyRow() };
        current!.bars.push(pending);
      }
      pending.lyrics[0] = pending.lyrics[0] ? `${pending.lyrics[0]}${lyric}` : lyric;
    });
  });
  return { title, artist, originalKey, bpm, capo, sections, form: formFor(plays, sections.filter(section => section.bars.length > 0)) };
};

export const parseChordSheet = (text: string): ChordSheetResult => {
  const unknown = new Set<string>();
  const unknownPatterns = new Set<string>();
  if (isChordPro(text)) {
    const result = parseChordPro(text, unknown, unknownPatterns);
    return {
      ...result,
      format: 'chordpro',
      sections: result.sections.filter(section => section.bars.length > 0),
      unknownChords: [...unknown],
      unknownPatterns: [...unknownPatterns],
    };
  }

  const lines = text.replace(/\t/g, '    ').split('\n').map(line => line.replace(/\s+$/, ''));
  let title = '';
  let artist = '';
  let originalKey = '';
  let bpm: number | null = null;
  let capo = 0;
  const sections: ImportedSection[] = [];
  let current: ImportedSection | null = null;
  let sawChords = false;
  let pendingBlank = false;
  const plays: Play[] = [];
  const patterns = patternTracker(unknownPatterns);
  const open = (name: string, repeat = 1) => {
    current = { title: name, pattern: patterns.active, bars: [] };
    sections.push(current);
    plays.push({ section: current, repeat });
    pendingBlank = false;
  };
  const replay = (section: ImportedSection, repeat: number) => {
    plays.push({ section, repeat });
    current = null;
    pendingBlank = false;
  };
  const nextContent = (from: number) => lines.slice(from).find(item => item.trim()) ?? '';
  // Whether a line starts written-out bars (chords, possibly after a header).
  const startsBars = (text: string) => {
    if (isChordLine(text)) return true;
    const header = splitHeader(text);
    return Boolean(header?.rest.trim() && isChordLine(header.rest));
  };
  // A blank line after some bars starts a new section, so a verse after an intro line is not merged into it.
  const ensure = () => {
    if (!current || (pendingBlank && current.bars.length > 0)) open(`段落 ${sections.length + 1}`);
    pendingBlank = false;
    return current!;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      pendingBlank = true;
      continue;
    }
    const patternLine = splitPatternLine(line);
    if (patternLine && !isChordLine(line)) {
      const header = patternLine.prefix ? splitHeader(patternLine.prefix) : null;
      if (header || (patternLine.prefix && SECTION_WORDS.test(patternLine.prefix))) {
        open(header?.header ?? patternLine.prefix);
      } else if (current && pendingBlank && current.bars.length > 0) {
        // The pattern starts the next block of the song.
        open(`段落 ${sections.length + 1}`);
      }
      patterns.apply(patternLine.text, current);
      continue;
    }
    const meta = readMeta(line);
    if (meta && !isChordLine(line)) {
      if (meta.bpm) bpm = meta.bpm;
      if (meta.capo !== undefined) capo = meta.capo;
      if (meta.artist) artist = meta.artist;
      if (meta.originalKey) originalKey = meta.originalKey;
      continue;
    }
    if (sawChords) {
      const jump = line.trim().match(JUMP);
      const target = jump ? splitRepeat(jump[1]) : null;
      const found = target ? findSection(sections, target.text) : undefined;
      if (found && target) {
        replay(found, target.repeat);
        continue;
      }
    }
    let header = splitHeader(line);
    let headerRepeat = 1;
    if (header && REPEAT.test(header.rest.trim())) {
      headerRepeat = Number(header.rest.trim().match(REPEAT)![1]);
      header = { header: header.header, rest: '' };
    } else if (!header) {
      const stripped = splitRepeat(line.trim());
      const candidate = stripped.repeat > 1 ? splitHeader(stripped.text) : null;
      if (candidate && !candidate.rest.trim()) {
        header = candidate;
        headerRepeat = stripped.repeat;
      }
    }
    let body = line;
    if (header) {
      const { text: name, repeat: nameRepeat } = splitRepeat(header.header);
      const repeat = Math.max(headerRepeat, nameRepeat);
      const earlier = !header.rest.trim() ? findSection(sections, name) : undefined;
      // A bare header naming an earlier section, with no bars under it, means "play that again".
      if (earlier && !startsBars(nextContent(index + 1))) {
        replay(earlier, repeat);
        continue;
      }
      open(name, repeat);
      if (!header.rest.trim()) continue;
      body = header.rest;
    }
    if (isChordLine(body)) {
      sawChords = true;
      const next = lines[index + 1];
      const lyric = next !== undefined && next.trim() && !isChordLine(next) && !splitHeader(next) && !readMeta(next) ? next : '';
      if (lyric) index += 1;
      // Keep the lyric aligned with the chord line when a header prefix was cut off.
      const offset = header ? ' '.repeat(Math.max(0, displayWidth(line) - displayWidth(body))) : '';
      const chordText = header ? `${offset}${body}` : body;
      ensure().bars.push(...barsFromPair(chordText, lyric, unknown));
      continue;
    }
    if (!sawChords && !title && !header) {
      title = cleanLyric(line);
      continue;
    }
    if (!sawChords) continue;
    // A lyric line without chords above it.
    const lyric = cleanLyric(line);
    if (lyric) ensure().bars.push({ chords: emptyRow(), lyrics: [lyric, ...emptyRow().slice(1)] });
  }

  const kept = sections.filter(section => section.bars.length > 0);
  return {
    title,
    artist,
    originalKey,
    bpm,
    capo,
    format: 'chords-over-lyrics',
    sections: kept,
    unknownChords: [...unknown],
    unknownPatterns: [...unknownPatterns],
    form: formFor(plays, kept),
  };
};

/** The pasted sheet as a new GuitarFlow song (lead sheet: chords and lyrics, empty tab). */
export const chordSheetToSong = (
  result: ChordSheetResult,
  title: string
): Omit<GuitarSong, 'id' | 'lastModified'> => ({
  title: title.trim() || '未命名歌曲',
  artist: result.artist,
  originalKey: result.originalKey,
  tags: [],
  form: result.form,
  bpm: result.bpm,
  transposeOffset: 0,
  voicingPlan: {},
  customChords: [],
  sections: result.sections.map((section, index): TabSection => ({
    id: `import-${index}`,
    title: section.title,
    capo: result.capo,
    timeSignature: [4, 4],
    pattern: section.pattern,
    measures: section.bars.map(() => Array.from({ length: 6 }, () => Array(COLS).fill('-'))),
    chords: section.bars.map(bar => bar.chords),
    lyrics: section.bars.map(bar => bar.lyrics),
  })),
});
