import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Dices, ListPlus, Play, Sparkles, Square } from 'lucide-react';
import { ChordDefinition, SongVoicingPlan, TabSection } from '../types';
import { MusicalKey, toPitchClass } from '../music-theory';
import { SoloDensity, SoloPhrase, SoloTechnique, generateSolo } from '../services/soloGenerator';
import { SoloPreviewHandle, playSoloPreview } from '../services/soloPreview';
import ScoreLine from './ScoreLine';

export const segmentButton = (active: boolean) =>
  `h-8 rounded-lg px-3 text-[11px] font-semibold transition-colors ${active
    ? 'bg-[#fffefa] text-[#171a18] shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
    : 'text-[#777a73] hover:text-[#171a18] dark:text-zinc-500 dark:hover:text-zinc-100'}`;

const TECHNIQUES: Array<{ id: SoloTechnique; label: string; description: string }> = [
  { id: 'guideTone', label: '引導音線', description: '每個和弦一個長音（3 度或 7 度），用最小的移動連起來。' },
  { id: 'arpeggio', label: '琶音', description: '沿著和弦音上下行，換和弦時換方向。' },
  { id: 'pentatonic', label: '五聲樂句', description: '用全曲五聲音階寫短句，每個和弦進來時落在和弦音。' },
  { id: 'doubleStop', label: '三度・六度雙音', description: '兩個音一起彈，抒情歌過門常用。' },
];

const DENSITIES: Array<{ id: SoloDensity; label: string }> = [
  { id: 'sparse', label: '稀疏' },
  { id: 'medium', label: '中等' },
  { id: 'dense', label: '密集' },
];

const DEFAULT_RANGE = { from: 5, to: 9 };
const COLS_PER_MEASURE = 16;

interface SoloGeneratorPanelProps {
  section: TabSection;
  /** Key of the chords as displayed (after the song's transpose). */
  displayKey: MusicalKey;
  transposeOffset: number;
  /** Fret range picked on the fretboard; null means "all". */
  range: { from: number; to: number } | null;
  chordLibrary: ChordDefinition[];
  voicingPlan: SongVoicingPlan;
  theme: 'light' | 'dark';
  onInsert: (section: Omit<TabSection, 'id'>) => void;
  onOpenCreate: () => void;
  /** "string:fret" positions sounding during the preview, or null when idle. */
  onActivePositionsChange: (positions: ReadonlySet<string> | null) => void;
}

const SoloGeneratorPanel: React.FC<SoloGeneratorPanelProps> = ({
  section,
  displayKey,
  transposeOffset,
  range,
  chordLibrary,
  voicingPlan,
  theme,
  onInsert,
  onOpenCreate,
  onActivePositionsChange,
}) => {
  const hasLyrics = useMemo(() => section.lyrics.some(row => row?.some(Boolean)), [section]);
  const [technique, setTechnique] = useState<SoloTechnique>('guideTone');
  const [density, setDensity] = useState<SoloDensity>('medium');
  const [fillLyricGaps, setFillLyricGaps] = useState(hasLyrics);
  const [useTechniques, setUseTechniques] = useState(true);
  const [seed, setSeed] = useState(1);
  const [bpm, setBpm] = useState(80);
  const [phrase, setPhrase] = useState<SoloPhrase | null>(null);
  const [playCol, setPlayCol] = useState<number | null>(null);
  const [insertedTitle, setInsertedTitle] = useState<string | null>(null);
  const previewRef = useRef<SoloPreviewHandle | null>(null);

  const stopPreview = () => {
    previewRef.current?.stop();
    previewRef.current = null;
  };

  // A new section starts from a clean slate.
  useEffect(() => {
    stopPreview();
    setPhrase(null);
    setInsertedTitle(null);
    setFillLyricGaps(section.lyrics.some(row => row?.some(Boolean)));
  }, [section.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => stopPreview, []);

  // Stored tab follows the song's source key, like the Create page and the practice player.
  const sourceKey = { ...displayKey, tonic: toPitchClass(displayKey.tonic - transposeOffset) };
  const effectiveRange = range ?? DEFAULT_RANGE;

  const generate = (nextSeed = seed) => {
    stopPreview();
    setSeed(nextSeed);
    setPhrase(generateSolo({
      section,
      transposeOffset: 0,
      key: sourceKey,
      technique,
      density,
      range: effectiveRange,
      fillLyricGaps,
      useTechniques: technique === 'pentatonic' && useTechniques,
      seed: nextSeed,
    }));
  };

  const togglePreview = async () => {
    if (previewRef.current) {
      stopPreview();
      return;
    }
    if (!phrase) return;
    try {
      previewRef.current = await playSoloPreview(
        { notes: phrase.notes, section, chordLibrary, voicingPlan, transposeOffset, bpm },
        col => {
          setPlayCol(col);
          if (col === null) previewRef.current = null;
        }
      );
    } catch {
      previewRef.current = null;
    }
  };

  // Frets only line up with the displayed fretboard when the song is not transposed.
  useEffect(() => {
    if (playCol === null || !phrase || transposeOffset !== 0) {
      onActivePositionsChange(null);
      return;
    }
    const sounding = phrase.notes.filter(note => {
      const start = note.measureIdx * COLS_PER_MEASURE + note.col;
      return playCol >= start && playCol < start + note.durationCols;
    });
    onActivePositionsChange(new Set(sounding.map(note => `${note.stringIndex}:${note.fret}`)));
  }, [playCol, phrase, transposeOffset, onActivePositionsChange]);

  const insert = () => {
    if (!phrase) return;
    stopPreview();
    const title = `Solo（${section.title}）`;
    setInsertedTitle(title);
    onInsert({
      title,
      capo: section.capo,
      timeSignature: section.timeSignature,
      measures: phrase.measures,
      chords: section.chords.map(row => [...row]),
      lyrics: section.chords.map(() => Array(COLS_PER_MEASURE).fill(null)),
    });
  };

  const selected = TECHNIQUES.find(item => item.id === technique)!;
  const playing = playCol !== null;

  return (
    <section className="space-y-4 rounded-2xl border border-[#dedcd4] bg-[#fffefa] p-5 dark:border-zinc-800 dark:bg-zinc-900" data-testid="solo-generator">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold"><Sparkles size={16} className="text-[#4d5bd2]" />產生 Solo（{section.title}）</h3>
        {!range && <span className="text-[11px] text-[#85877f]">把位選「全部」時，預設用中把位 5–9 格</span>}
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap rounded-xl bg-[#efede7] p-1 dark:bg-zinc-800/60" role="group" aria-label="手法">
          {TECHNIQUES.map(item => (
            <button key={item.id} type="button" className={segmentButton(technique === item.id)} onClick={() => setTechnique(item.id)}>{item.label}</button>
          ))}
        </div>
        <div className="flex rounded-xl bg-[#efede7] p-1 dark:bg-zinc-800/60" role="group" aria-label="密度">
          {DENSITIES.map(item => (
            <button key={item.id} type="button" className={segmentButton(density === item.id)} onClick={() => setDensity(item.id)}>{item.label}</button>
          ))}
        </div>
      </div>
      <p className="text-xs text-[#6e716b] dark:text-zinc-400">{selected.description}</p>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={fillLyricGaps} onChange={event => setFillLyricGaps(event.target.checked)} className="accent-[#2b6c59]" />
          只在歌詞空白處填句
        </label>
        <label className={`flex items-center gap-2 ${technique === 'pentatonic' ? '' : 'opacity-40'}`}>
          <input type="checkbox" checked={useTechniques} disabled={technique !== 'pentatonic'} onChange={event => setUseTechniques(event.target.checked)} className="accent-[#2b6c59]" />
          加入搥勾推技巧（五聲樂句）
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => generate(seed)} className="flex h-10 items-center gap-2 rounded-xl bg-[#171a18] px-4 text-xs font-semibold text-white hover:bg-[#4d5bd2] dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-violet-400">
          <Sparkles size={15} />產生
        </button>
        <button type="button" onClick={() => generate(seed + 1)} disabled={!phrase} className="flex h-10 items-center gap-2 rounded-xl border border-[#dedcd4] px-3 text-xs font-semibold disabled:opacity-40 dark:border-zinc-700">
          <Dices size={15} />換一個
        </button>
        <button type="button" onClick={togglePreview} disabled={!phrase || phrase.notes.length === 0} className="flex h-10 items-center gap-2 rounded-xl border border-[#dedcd4] px-3 text-xs font-semibold disabled:opacity-40 dark:border-zinc-700">
          {playing ? <Square size={14} /> : <Play size={15} />}{playing ? '停止' : '試聽'}
        </button>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-[#dedcd4] px-3 text-xs font-semibold dark:border-zinc-700">
          BPM
          <input
            type="number"
            min={40}
            max={200}
            value={bpm}
            onChange={event => setBpm(Math.max(40, Math.min(200, Number(event.target.value) || 80)))}
            disabled={playing}
            className="w-14 bg-transparent font-mono outline-none"
            aria-label="試聽速度"
          />
        </label>
        <button type="button" onClick={insert} disabled={!phrase || phrase.notes.length === 0} className="ml-auto flex h-10 items-center gap-2 rounded-xl bg-[#2b6c59] px-4 text-xs font-semibold text-white disabled:opacity-40">
          <ListPlus size={15} />加入歌曲
        </button>
      </div>

      {insertedTitle && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[#e8f0eb] px-3 py-2 text-xs font-semibold text-[#2b6c59] dark:bg-emerald-950/40 dark:text-emerald-300" data-testid="solo-inserted">
          <Check size={15} />已加入「{insertedTitle}」，記得儲存歌曲
          <button type="button" onClick={onOpenCreate} className="ml-auto rounded-lg border border-[#2b6c59]/30 px-2.5 py-1 hover:bg-white/60 dark:hover:bg-zinc-900">到創作頁編輯</button>
        </div>
      )}

      {phrase && (
        <div className="space-y-3">
          {phrase.warnings.length > 0 && (
            <ul className="space-y-1 rounded-lg bg-[#fbf1dc] px-3 py-2 text-xs text-[#8a5a12] dark:bg-amber-950/50 dark:text-amber-200">
              {phrase.warnings.map(warning => <li key={warning}>{warning}</li>)}
            </ul>
          )}
          {phrase.notes.length > 0 && (
            <div className="space-y-2" data-testid="solo-preview">
              <div className="text-[11px] text-[#85877f]">
                第 {seed} 版 · 格數以 Capo 為 0 格{transposeOffset !== 0 ? ` · 依原調記譜（試聽會移調 ${transposeOffset > 0 ? '+' : ''}${transposeOffset}）` : ''}
              </div>
              <div className="grid gap-2 xl:grid-cols-2">
                {phrase.measures.map((measure, measureIdx) => (
                  <ScoreLine
                    key={measureIdx}
                    variant="flow"
                    measureIndex={measureIdx}
                    measure={measure}
                    chords={section.chords[measureIdx] ?? []}
                    lyrics={section.lyrics[measureIdx] ?? []}
                    playCol={playCol !== null && Math.floor(playCol / COLS_PER_MEASURE) === measureIdx ? playCol % COLS_PER_MEASURE : null}
                    theme={theme}
                    className="overflow-x-auto rounded-xl border border-[#dedcd4] dark:border-zinc-800"
                  />
                ))}
              </div>
              <p className="text-[11px] text-[#85877f]">
                加入歌曲後會成為新的段落，可在「創作」頁修改。練習頁播放時，有音符的拍子不會另外刷和弦；帶伴奏的效果請用這裡的「試聽」。
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default SoloGeneratorPanel;
