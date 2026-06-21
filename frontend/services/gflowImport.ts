import { GuitarSong, TabSection, ChordDefinition } from '../types';
import { createEmptyMeasure } from '../hooks/useEditorState';
import { DEFAULT_TIME_SIGNATURE } from '../constants/practice';

export type GflowImportResult =
  | { ok: true; data: Omit<GuitarSong, 'id' | 'lastModified'> }
  | { ok: false; error: string };

const isStringArray = (v: unknown, length?: number): v is string[] =>
  Array.isArray(v) && v.every(x => typeof x === 'string') && (length === undefined || v.length === length);

const isNullableStringArray = (v: unknown, length?: number): v is (string | null)[] =>
  Array.isArray(v) &&
  v.every(x => x === null || typeof x === 'string') &&
  (length === undefined || v.length === length);

const parseChord = (v: unknown): ChordDefinition | null => {
  if (!v || typeof v !== 'object') return null;
  const obj = v as Record<string, unknown>;
  if (typeof obj.name !== 'string') return null;
  if (!Array.isArray(obj.frets)) return null;
  const frets = obj.frets.map(f => (f === null ? null : typeof f === 'number' ? f : null));
  if (frets.length !== 6) return null;
  return { name: obj.name, frets };
};

const parseSection = (v: unknown, index: number): TabSection | null => {
  if (!v || typeof v !== 'object') return null;
  const obj = v as Record<string, unknown>;

  const title = typeof obj.title === 'string' ? obj.title : `Section ${index + 1}`;
  const capo = typeof obj.capo === 'number' ? Math.max(0, Math.min(12, obj.capo)) : 0;
  const id = typeof obj.id === 'string' ? obj.id : Math.random().toString(36).slice(2, 11);

  let timeSignature: [number, number] | undefined;
  if (Array.isArray(obj.timeSignature) && obj.timeSignature.length === 2) {
    const num = obj.timeSignature[0];
    const den = obj.timeSignature[1];
    if (typeof num === 'number' && typeof den === 'number' && num > 0 && den > 0) {
      timeSignature = [num, den];
    }
  }

  if (!Array.isArray(obj.measures) || obj.measures.length === 0) {
    return {
      id,
      title,
      capo,
      timeSignature: timeSignature ?? [...DEFAULT_TIME_SIGNATURE],
      measures: [createEmptyMeasure()],
      chords: [Array(16).fill(null)],
      lyrics: [Array(16).fill(null)],
    };
  }

  const measures: string[][][] = [];
  for (const measure of obj.measures) {
    if (!Array.isArray(measure) || measure.length !== 6) return null;
    const strings: string[][] = [];
    for (const stringLine of measure) {
      if (!isStringArray(stringLine, 16)) return null;
      strings.push([...stringLine]);
    }
    measures.push(strings);
  }

  const measureCount = measures.length;
  const chords: (string | null)[][] = [];
  if (Array.isArray(obj.chords)) {
    for (let i = 0; i < measureCount; i++) {
      const row = obj.chords[i];
      chords.push(isNullableStringArray(row, 16) ? [...row] : Array(16).fill(null));
    }
  } else {
    for (let i = 0; i < measureCount; i++) chords.push(Array(16).fill(null));
  }

  const lyrics: (string | null)[][] = [];
  if (Array.isArray(obj.lyrics)) {
    for (let i = 0; i < measureCount; i++) {
      const row = obj.lyrics[i];
      lyrics.push(isNullableStringArray(row, 16) ? [...row] : Array(16).fill(null));
    }
  } else {
    for (let i = 0; i < measureCount; i++) lyrics.push(Array(16).fill(null));
  }

  return {
    id,
    title,
    capo,
    timeSignature: timeSignature ?? [...DEFAULT_TIME_SIGNATURE],
    measures,
    chords,
    lyrics,
  };
};

export const parseGflowFile = (raw: unknown): GflowImportResult => {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Invalid file: expected a JSON object.' };
  }

  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === 'string' && obj.title.trim() ? obj.title.trim() : 'Imported Song';
  const transposeOffset =
    typeof obj.transposeOffset === 'number'
      ? Math.max(-12, Math.min(12, obj.transposeOffset))
      : 0;

  if (!Array.isArray(obj.sections) || obj.sections.length === 0) {
    return { ok: false, error: 'Invalid file: at least one section is required.' };
  }

  const sections: TabSection[] = [];
  for (let i = 0; i < obj.sections.length; i++) {
    const section = parseSection(obj.sections[i], i);
    if (!section) {
      return { ok: false, error: `Invalid section at index ${i}.` };
    }
    sections.push(section);
  }

  const customChords: ChordDefinition[] = [];
  if (Array.isArray(obj.customChords)) {
    for (const chord of obj.customChords) {
      const parsed = parseChord(chord);
      if (parsed) customChords.push(parsed);
    }
  }

  return {
    ok: true,
    data: { title, sections, customChords, transposeOffset },
  };
};

export const readGflowFile = (file: File): Promise<GflowImportResult> =>
  new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        resolve(parseGflowFile(json));
      } catch {
        resolve({ ok: false, error: 'Could not parse JSON file.' });
      }
    };
    reader.onerror = () => resolve({ ok: false, error: 'Failed to read file.' });
    reader.readAsText(file);
  });
