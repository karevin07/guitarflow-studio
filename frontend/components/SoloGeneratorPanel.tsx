import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Dices, ListPlus, Minus, Play, Plus, Sparkles, Square } from 'lucide-react';
import { ChordDefinition, SongVoicingPlan, TabSection } from '../types';
import { MusicalKey, formatPitch, keyAccidentalPreference, toPitchClass } from '../music-theory';
import { POSITION_WINDOWS, PositionWindowId } from '../guitar';
import { SoloDensity, SoloPhrase, SoloTechnique, generateSolo } from '../services/soloGenerator';
import { SoloPreviewHandle, playSoloPreview } from '../services/soloPreview';
import { FretMark } from '../services/soloGuide';
import SoloFretboard from './SoloFretboard';
import SoloTabView from './SoloTabView';
import { card, segmentButton, segmentGroup, stepLabel, stepNumber } from './arrangeStyles';

const STYLES: Array<{ id: SoloTechnique; label: string; level: string; description: string; example: string }> = [
  { id: 'guideTone', label: '引導音線', level: '入門', description: '每個和弦一個長音，最好彈也最有旋律感', example: 'e|-8-------7-|\nB|-----------|' },
  { id: 'arpeggio', label: '琶音', level: '入門', description: '把和弦的音一個一個彈出來', example: 'e|-8---------|\nB|---8-------|\nG|-----9-----|' },
  { id: 'pentatonic', label: '五聲樂句', level: '進階', description: '流行歌間奏最常見的旋律短句', example: 'B|-5h7--5----|\nG|-------7---|' },
  { id: 'doubleStop', label: '雙音', level: '進階', description: '兩個音一起彈，抒情歌過門常用', example: 'e|-8---8-----|\nG|-9---9-----|' },
];

const DENSITIES: Array<{ id: SoloDensity; label: string; hint: string }> = [
  { id: 'sparse', label: '稀疏', hint: '音少、留白多' },
  { id: 'medium', label: '中等', hint: '一拍一到兩個音' },
  { id: 'dense', label: '密集', hint: '比較炫、比較難' },
];

type GeneratorPosition = PositionWindowId;

const COLS_PER_MEASURE = 16;

interface SoloGeneratorPanelProps {
  section: TabSection;
  /** Key of the chords as displayed (after the song's transpose). */
  displayKey: MusicalKey;
  transposeOffset: number;
  chordLibrary: ChordDefinition[];
  voicingPlan: SongVoicingPlan;
  onInsert: (section: Omit<TabSection, 'id'>) => void;
  onOpenCreate: () => void;
}

const SoloGeneratorPanel: React.FC<SoloGeneratorPanelProps> = ({
  section,
  displayKey,
  transposeOffset,
  chordLibrary,
  voicingPlan,
  onInsert,
  onOpenCreate,
}) => {
  const hasLyrics = useMemo(() => section.lyrics.some(row => row?.some(Boolean)), [section]);
  const [technique, setTechnique] = useState<SoloTechnique>('guideTone');
  const [density, setDensity] = useState<SoloDensity>('medium');
  const [position, setPosition] = useState<GeneratorPosition>('middle');
  const [moreOpen, setMoreOpen] = useState(false);
  const [fillLyricGaps, setFillLyricGaps] = useState(hasLyrics);
  const [useTechniques, setUseTechniques] = useState(true);
  const [seed, setSeed] = useState(1);
  const [bpm, setBpm] = useState(80);
  const [phrase, setPhrase] = useState<SoloPhrase | null>(null);
  const [playCol, setPlayCol] = useState<number | null>(null);
  const [insertedTitle, setInsertedTitle] = useState<string | null>(null);
  const previewRef = useRef<SoloPreviewHandle | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

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
  const range = POSITION_WINDOWS.find(window => window.id === position) ?? POSITION_WINDOWS[1];

  const generate = (nextSeed: number) => {
    stopPreview();
    setSeed(nextSeed);
    setInsertedTitle(null);
    setPhrase(generateSolo({
      section,
      transposeOffset: 0,
      key: sourceKey,
      technique,
      density,
      range,
      fillLyricGaps,
      useTechniques: technique === 'pentatonic' && useTechniques,
      seed: nextSeed,
    }));
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
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

  // Where the phrase sits on the neck: its own notes, labelled by name.
  const neck = useMemo(() => {
    if (!phrase || phrase.notes.length === 0) return null;
    const preference = keyAccidentalPreference(sourceKey);
    const marks: Array<FretMark | null> = Array(12).fill(null);
    phrase.notes.forEach(note => {
      marks[note.pitch] = { role: 'scale', label: formatPitch(note.pitch, preference) };
    });
    const frets = phrase.notes.map(note => note.fret);
    return {
      marks,
      only: new Set(phrase.notes.map(note => `${note.stringIndex}:${note.fret}`)),
      range: { from: Math.max(0, Math.min(...frets) - 1), to: Math.max(...frets) + 1 },
    };
  }, [phrase]); // eslint-disable-line react-hooks/exhaustive-deps

  const activePositions = useMemo(() => {
    if (playCol === null || !phrase) return null;
    return new Set(phrase.notes
      .filter(note => {
        const start = note.measureIdx * COLS_PER_MEASURE + note.col;
        return playCol >= start && playCol < start + note.durationCols;
      })
      .map(note => `${note.stringIndex}:${note.fret}`));
  }, [playCol, phrase]);

  const playing = playCol !== null;
  const hasResult = Boolean(phrase && phrase.notes.length > 0);

  return (
    <div className="space-y-5" data-testid="solo-generator">
      <section className={`${card} space-y-6 p-5 sm:p-6`}>
        <div className="space-y-3">
          <div className={stepLabel}><span className={stepNumber}>1</span>選風格</div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="radiogroup" aria-label="風格">
            {STYLES.map(style => {
              const active = technique === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTechnique(style.id)}
                  className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors ${active
                    ? 'border-[#4d5bd2] bg-[#eef0fd] ring-1 ring-[#4d5bd2] dark:border-violet-500 dark:bg-violet-950/40 dark:ring-violet-500'
                    : 'border-[#dedcd4] hover:border-[#bfc2e8] dark:border-zinc-700'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold">{style.label}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${style.level === '入門' ? 'bg-[#e8f0eb] text-[#2b6c59] dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-[#fbf1dc] text-[#8a5a12] dark:bg-amber-950/50 dark:text-amber-200'}`}>{style.level}</span>
                  </span>
                  <span className="text-[11px] leading-snug text-[#6e716b] dark:text-zinc-400">{style.description}</span>
                  <pre className="overflow-hidden rounded-md bg-[#f3f1eb] px-2 py-1 font-mono text-[11px] leading-tight text-[#6e716b] dark:bg-zinc-800 dark:text-zinc-400" aria-hidden="true">{style.example}</pre>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className={stepLabel}><span className={stepNumber}>2</span>音要多密</div>
            <div className={segmentGroup} role="radiogroup" aria-label="密度">
              {DENSITIES.map(item => (
                <button key={item.id} type="button" role="radio" aria-checked={density === item.id} className={segmentButton(density === item.id)} onClick={() => setDensity(item.id)}>{item.label}</button>
              ))}
            </div>
            <p className="text-[11px] text-[#85877f]">{DENSITIES.find(item => item.id === density)?.hint}</p>
          </div>
          <div className="space-y-3">
            <div className={stepLabel}><span className={stepNumber}>3</span>在哪裡彈</div>
            <div className={segmentGroup} role="radiogroup" aria-label="把位">
              {POSITION_WINDOWS.map(window => (
                <button key={window.id} type="button" role="radio" aria-checked={position === window.id} className={segmentButton(position === window.id)} onClick={() => setPosition(window.id)}>
                  {window.label.replace('（開放）', '')}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#85877f]">{range.from}–{range.to} 格{section.capo > 0 ? `（從 Capo 算起，Capo 是 0 格）` : ''}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-[#efede7] pt-5 dark:border-zinc-800">
          <button type="button" onClick={() => generate(hasResult ? seed : 1)} className="flex h-11 items-center gap-2 rounded-xl bg-[#4d5bd2] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#3f4bb8] dark:bg-violet-500 dark:hover:bg-violet-400">
            <Sparkles size={16} />產生 Solo
          </button>
          <button type="button" onClick={() => setMoreOpen(open => !open)} aria-expanded={moreOpen} className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-[#6e716b] hover:text-[#171a18] dark:text-zinc-400 dark:hover:text-zinc-100">
            更多選項<ChevronDown size={14} className={moreOpen ? 'rotate-180' : ''} />
          </button>
          {moreOpen && (
            <div className="flex w-full flex-wrap gap-x-6 gap-y-2 text-xs font-semibold">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={fillLyricGaps} onChange={event => setFillLyricGaps(event.target.checked)} className="accent-[#2b6c59]" />
                避開主唱：只在歌詞空白處彈
              </label>
              <label className={`flex items-center gap-2 ${technique === 'pentatonic' ? '' : 'opacity-40'}`}>
                <input type="checkbox" checked={useTechniques} disabled={technique !== 'pentatonic'} onChange={event => setUseTechniques(event.target.checked)} className="accent-[#2b6c59]" />
                加入搥弦、勾弦、推弦（五聲樂句）
              </label>
            </div>
          )}
        </div>
      </section>

      {phrase && (
        <section ref={resultRef} className={card} style={{ scrollMarginTop: 'calc(var(--arrange-header, 64px) + 12px)' }} data-testid="solo-result">
          <div className="sticky z-20 flex flex-wrap items-center gap-2 rounded-t-2xl border-b border-[#efede7] bg-[#fffefa]/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 sm:px-5" style={{ top: 'var(--arrange-header, 64px)' }}>
            <button type="button" onClick={togglePreview} disabled={!hasResult} className="flex h-10 items-center gap-2 rounded-xl bg-[#171a18] px-4 text-xs font-semibold text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-950">
              {playing ? <Square size={14} /> : <Play size={15} />}{playing ? '停止' : '試聽'}
            </button>
            <div className="flex h-10 items-center rounded-xl border border-[#dedcd4] dark:border-zinc-700">
              <button type="button" onClick={() => setBpm(value => Math.max(40, value - 5))} disabled={playing} className="grid h-10 w-8 place-items-center text-[#6e716b] disabled:opacity-40" aria-label="放慢"><Minus size={13} /></button>
              <span className="w-16 text-center font-mono text-xs font-semibold" aria-label="試聽速度">{bpm} BPM</span>
              <button type="button" onClick={() => setBpm(value => Math.min(200, value + 5))} disabled={playing} className="grid h-10 w-8 place-items-center text-[#6e716b] disabled:opacity-40" aria-label="加快"><Plus size={13} /></button>
            </div>
            <button type="button" onClick={() => generate(seed + 1)} className="flex h-10 items-center gap-2 rounded-xl border border-[#dedcd4] px-3 text-xs font-semibold dark:border-zinc-700">
              <Dices size={15} />換一個
            </button>
            <span className="hidden text-[11px] text-[#85877f] sm:inline">第 {seed} 版</span>
            <button type="button" onClick={insert} disabled={!hasResult} className="ml-auto flex h-10 items-center gap-2 rounded-xl bg-[#2b6c59] px-4 text-xs font-semibold text-white disabled:opacity-40">
              <ListPlus size={15} />加入歌曲
            </button>
          </div>

          <div className="space-y-5 p-4 sm:p-5">
            {insertedTitle && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[#e8f0eb] px-3 py-2 text-xs font-semibold text-[#2b6c59] dark:bg-emerald-950/40 dark:text-emerald-300" data-testid="solo-inserted">
                <Check size={15} />已加入「{insertedTitle}」，記得按 Save 儲存歌曲
                <button type="button" onClick={onOpenCreate} className="ml-auto rounded-lg border border-[#2b6c59]/30 px-2.5 py-1 hover:bg-white/60 dark:hover:bg-zinc-900">到創作頁編輯</button>
              </div>
            )}
            {phrase.warnings.length > 0 && (
              <ul className="space-y-1 rounded-lg bg-[#fbf1dc] px-3 py-2 text-xs text-[#8a5a12] dark:bg-amber-950/50 dark:text-amber-200">
                {phrase.warnings.map(warning => <li key={warning}>{warning}</li>)}
              </ul>
            )}
            {hasResult && (
              <>
                <div data-testid="solo-preview">
                  <SoloTabView measures={phrase.measures} chords={section.chords} lyrics={section.lyrics} playCol={playCol} />
                </div>
                {neck && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-[#85877f]">在指板上的位置（試聽時會亮起正在彈的音）</div>
                    <SoloFretboard marks={neck.marks} only={neck.only} range={neck.range} activePositions={activePositions} />
                  </div>
                )}
                <p className="text-[11px] text-[#85877f]">
                  格數以 Capo 為 0 格{transposeOffset !== 0 ? `，依原調記譜（試聽會移調 ${transposeOffset > 0 ? '+' : ''}${transposeOffset}）` : ''}。加入歌曲後會成為新的段落，可在「創作」頁修改。
                </p>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default SoloGeneratorPanel;
