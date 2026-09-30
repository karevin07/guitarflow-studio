import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Anchor, ArrowLeftRight, Check, ChevronDown, ChevronsDown, Layers3, Minus, PanelRight, Pause, Play, Plus, Repeat, RotateCcw, Sparkles, Type } from 'lucide-react';
import { TabSection, ChordDefinition, SongVoicingPlan, SongVoicingPreference } from '../types';
import { PlaybackPosition } from '../types/playback';
import { formatPitch, parseChord, transposePitch } from '../music-theory';
import {
  CapoViewMode,
  describeKey,
  displaySpelling,
  loadCapoViewMode,
  primaryCapo,
  saveCapoViewMode,
  sectionDisplayShift,
  shiftChordForDisplay,
  shiftedSongKey,
} from '../services/capoView';
import ChordWorkspacePanel from './ChordWorkspacePanel';
import ChordSwitchTrainer from './ChordSwitchTrainer';
import PatternPicker from './PatternPicker';
import SongFormBar from './SongFormBar';
import { SongFormEntry } from '../services/songForm';
import LeadSheetMeasure from './LeadSheetMeasure';
import VoicingPlanReview from './VoicingPlanReview';

interface SongPreviewProps {
  sections: TabSection[];
  /** Used to remember the capo view per song. */
  songId?: string | null;
  customChords?: ChordDefinition[];
  globalChords?: ChordDefinition[];
  externalTranspose?: number;
  onTransposeChange?: (newVal: number) => void;
  theme?: 'light' | 'dark';
  playState?: PlaybackPosition | null;
  voicingPlan?: SongVoicingPlan;
  onVoicingPlanChange?: (plan: SongVoicingPlan) => void;
  /** Loop a section in the player; called again on the same section to stop. */
  onLoopSection?: (sectionIdx: number) => void;
  loopedSectionIdx?: number;
  /** Change one section's accompaniment, or every section's when sectionId is null. */
  onSectionPatternChange?: (sectionId: string | null, pattern: string) => void;
  /** Play order; empty plays sections as written. */
  form?: SongFormEntry[];
  onFormChange?: (form: SongFormEntry[]) => void;
  /** Jump playback to a step of the play order. */
  onJumpToStep?: (step: number) => void;
}

const sectionAnchor = (id: string): string => `preview-section-${id}`;
const AUTO_SCROLL_SPEED_KEY = 'guitarflow-auto-scroll-speed';
const SCORE_FONT_SCALE_KEY = 'guitarflow-read-font-scale';
// Songbook rows are short, so a gentle base speed keeps a row on screen for several bars.
const AUTO_SCROLL_PX_PER_SECOND = 12;

const SongPreview: React.FC<SongPreviewProps> = ({
  sections,
  onLoopSection,
  loopedSectionIdx = -1,
  onSectionPatternChange,
  form = [],
  onFormChange,
  onJumpToStep,
  songId = null,
  customChords = [],
  globalChords = [],
  externalTranspose = 0,
  onTransposeChange,
  theme = 'dark',
  playState = null,
  voicingPlan = {},
  onVoicingPlanChange,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [selectedChord, setSelectedChord] = useState<string | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [mobileSectionOpen, setMobileSectionOpen] = useState(false);
  const [mobileSectionId, setMobileSectionId] = useState<string | null>(sections[0]?.id ?? null);
  const [mobileOverviewOpen, setMobileOverviewOpen] = useState(false);
  const [showChordPanel, setShowChordPanel] = useState(true);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [switchTrainerOpen, setSwitchTrainerOpen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [fontScale, setFontScale] = useState(() => {
    const stored = Number(localStorage.getItem(SCORE_FONT_SCALE_KEY));
    return Number.isFinite(stored) && stored >= 0.8 && stored <= 1.4 ? stored : 1;
  });
  const [scrollSpeed, setScrollSpeed] = useState(() => {
    const stored = Number(localStorage.getItem(AUTO_SCROLL_SPEED_KEY));
    return Number.isFinite(stored) && stored >= 0.5 && stored <= 2 ? stored : 1;
  });
  const transpose = externalTranspose;
  const [capoMode, setCapoMode] = useState<CapoViewMode>(() => loadCapoViewMode(songId));
  useEffect(() => setCapoMode(loadCapoViewMode(songId)), [songId]);
  const changeCapoMode = (mode: CapoViewMode) => {
    setCapoMode(mode);
    saveCapoViewMode(songId, mode);
  };
  const hasCapo = sections.some(section => section.capo > 0);
  const viewMode: CapoViewMode = hasCapo ? capoMode : 'shape';
  const concert = viewMode === 'concert';
  const songCapo = primaryCapo(sections);
  // Chord names, the diagram panel and the key label all read in this shift.
  const globalShift = sectionDisplayShift(songCapo, transpose, viewMode);
  // Spell by the sounding key only when the capo is dropped; plain transposing keeps its old spelling.
  const spellingFor = useMemo(() => {
    const cache = new Map<number, ReturnType<typeof displaySpelling>>();
    return (shift: number) => {
      if (!concert) return undefined;
      if (!cache.has(shift)) cache.set(shift, displaySpelling(sections, shift));
      return cache.get(shift);
    };
  }, [concert, sections]);
  const displayChord = (name: string | null, shift = globalShift) => shiftChordForDisplay(name, shift, spellingFor(shift));
  const chordLibrary = useMemo(
    () => [...globalChords, ...customChords],
    [globalChords, customChords]
  );
  const chordNames = useMemo(() => Array.from(new Set(
    sections.flatMap(section => section.chords.flat()).filter((name): name is string => Boolean(name))
  )), [sections]);

  useEffect(() => {
    if (!selectedChord || !chordNames.includes(selectedChord)) {
      setSelectedChord(chordNames[0] ?? null);
    }
  }, [chordNames, selectedChord]);

  useEffect(() => {
    localStorage.setItem(AUTO_SCROLL_SPEED_KEY, String(scrollSpeed));
  }, [scrollSpeed]);

  useEffect(() => {
    localStorage.setItem(SCORE_FONT_SCALE_KEY, String(fontScale));
  }, [fontScale]);

  useEffect(() => {
    if (!mobilePanelOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobilePanelOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobilePanelOpen]);

  useEffect(() => {
    if (!playState) return;
    document.getElementById(`preview-measure-${playState.sectionIdx}-${playState.measureIdx}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [playState?.measureIdx, playState?.sectionIdx]);

  useEffect(() => {
    if (!autoScroll) return;
    const scroller = rootRef.current?.parentElement;
    if (!scroller) return;

    let frame = 0;
    let previousTime: number | null = null;
    const tick = (time: number) => {
      if (previousTime !== null) {
        scroller.scrollTop += ((time - previousTime) / 1000) * AUTO_SCROLL_PX_PER_SECOND * scrollSpeed;
        if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
          setAutoScroll(false);
          return;
        }
      }
      previousTime = time;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [autoScroll, scrollSpeed]);

  const renderedSections = useMemo(() => sections.map(section => {
    const shift = sectionDisplayShift(section.capo, transpose, viewMode);
    return {
      ...section,
      displayChords: section.chords.map(measure =>
        measure.map(name => shiftChordForDisplay(name, shift, spellingFor(shift)))
      ),
    };
  }), [sections, transpose, viewMode, spellingFor]);

  const baseChord = chordNames.map(parseChord).find(chord => chord !== null) ?? null;
  const originalKey = baseChord ? formatPitch(baseChord.root, baseChord.accidentalPreference) : '—';
  const currentKey = concert
    ? describeKey(shiftedSongKey(sections, globalShift))
    : baseChord
      ? formatPitch(transposePitch(baseChord.root, transpose), baseChord.accidentalPreference)
      : '—';
  const selectedDisplayChord = displayChord(selectedChord);
  const transposeLabel = transpose === 0 ? `原調 ${originalKey}` : `原調 ${originalKey} · 移調 ${transpose > 0 ? '+' : ''}${transpose}`;
  const shapeKeyLabel = describeKey(shiftedSongKey(sections, transpose));
  const concertKeyLabel = describeKey(shiftedSongKey(sections, transpose + songCapo));
  // Voicing locks are stored for the capo shapes, so editing them is only offered in that view.
  const canEditVoicings = Boolean(onVoicingPlanChange) && !concert;
  const capoValues = Array.from(new Set(sections.map(section => section.capo).filter(Boolean)));
  const capoLabel = capoValues.length === 0 ? '0' : capoValues.length === 1 ? String(capoValues[0]) : 'Varies';
  const mobileSection = sections.find(section => section.id === mobileSectionId) ?? sections[0];

  const jumpToSection = (id: string) => {
    setMobileSectionId(id);
    setMobileSectionOpen(false);
    document.getElementById(sectionAnchor(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleAutoScroll = () => {
    if (!autoScroll) {
      const scroller = rootRef.current?.parentElement;
      if (scroller && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
        scroller.scrollTop = 0;
      }
    }
    setAutoScroll(value => !value);
  };

  const chooseChord = (name: string) => {
    setSelectedChord(name);
    if (showChordPanel) setMobilePanelOpen(true);
  };
  const updateSelectedPreference = (preference: SongVoicingPreference | null) => {
    if (!selectedChord || !onVoicingPlanChange) return;
    const next = { ...voicingPlan };
    if (preference) next[selectedChord] = preference;
    else delete next[selectedChord];
    onVoicingPlanChange(next);
  };

  return (
    <div ref={rootRef} className="min-h-full bg-[#f6f6f3] text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="sticky top-0 z-30 border-b border-slate-200/90 bg-[#f6f6f3]/95 px-4 py-3 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-6 lg:px-10 print:hidden">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3">
          <div className="flex items-center gap-2 sm:hidden">
            <div className="flex h-11 min-w-0 flex-1 items-center justify-between rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <button type="button" onClick={() => onTransposeChange?.(Math.max(-12, transpose - 1))} className="grid h-11 w-11 shrink-0 place-items-center text-slate-600 dark:text-zinc-300" aria-label="Transpose down"><Minus size={17} /></button>
              <div className="min-w-0 text-center"><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">調性</div><div className="font-mono text-base font-bold">{currentKey}</div></div>
              <button type="button" onClick={() => onTransposeChange?.(Math.min(12, transpose + 1))} className="grid h-11 w-11 shrink-0 place-items-center text-slate-600 dark:text-zinc-300" aria-label="Transpose up"><Plus size={17} /></button>
            </div>
            {hasCapo ? (
              <button type="button" onClick={() => changeCapoMode(concert ? 'shape' : 'concert')} aria-pressed={concert} aria-label={concert ? `改回 Capo ${capoLabel}・${shapeKeyLabel} 指型` : `不夾 Capo・${concertKeyLabel} 調`} className={`flex h-11 shrink-0 flex-col items-center justify-center rounded-xl border px-3 ${concert ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300' : 'border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'}`}>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Capo</span>
                <span className="font-mono text-sm font-bold">{concert ? '不夾' : capoLabel}</span>
              </button>
            ) : (
              <div className="flex h-11 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-3 dark:border-zinc-800 dark:bg-zinc-900"><span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Capo</span><span className="font-mono text-sm font-bold">{capoLabel}</span></div>
            )}
            <div className="flex h-11 shrink-0 items-center rounded-xl border border-slate-200 bg-white px-1 dark:border-zinc-800 dark:bg-zinc-900">
              <button type="button" onClick={() => setFontScale(scale => Math.max(0.8, Number((scale - 0.1).toFixed(1))))} className="grid h-11 w-9 place-items-center text-xs font-semibold text-slate-600 dark:text-zinc-300" aria-label="Decrease score font size">A−</button>
              <button type="button" onClick={() => setFontScale(scale => Math.min(1.4, Number((scale + 0.1).toFixed(1))))} className="grid h-11 w-9 place-items-center text-xs font-semibold text-slate-600 dark:text-zinc-300" aria-label="Increase score font size">A+</button>
            </div>
            <button type="button" onClick={toggleAutoScroll} aria-label={autoScroll ? '暫停自動捲動' : '開始自動捲動'} aria-pressed={autoScroll} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${autoScroll ? 'border-slate-950 bg-slate-950 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950' : 'border-slate-200 bg-white text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'}`}>
              {autoScroll ? <Pause size={16} fill="currentColor" /> : <ChevronsDown size={18} />}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 sm:hidden">
            <div className="relative min-w-0">
              <button type="button" onClick={() => setMobileSectionOpen(open => !open)} aria-label="選擇段落" aria-expanded={mobileSectionOpen} className="flex h-8 max-w-44 items-center gap-1.5 rounded-lg px-1 text-xs font-semibold text-slate-700 dark:text-zinc-200"><span className="truncate">{mobileSection?.title ?? '段落'}</span><ChevronDown size={14} className="shrink-0" /></button>
              {mobileSectionOpen && <div role="group" aria-label="段落清單" className="absolute left-0 top-9 z-50 max-h-56 min-w-44 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">{sections.map(section => <button key={section.id} type="button" onClick={() => jumpToSection(section.id)} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800">{section.title}</button>)}</div>}
            </div>
            {autoScroll ? (
              <div className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                捲動速度
                <button type="button" onClick={() => setScrollSpeed(speed => Math.max(0.5, speed - 0.25))} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800" aria-label="Slower auto scroll"><Minus size={13} /></button>
                <span className="w-8 text-center font-mono">{scrollSpeed}x</span>
                <button type="button" onClick={() => setScrollSpeed(speed => Math.min(2, speed + 0.25))} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800" aria-label="Faster auto scroll"><Plus size={13} /></button>
              </div>
            ) : (
              <span className="shrink-0 text-[11px] font-medium text-slate-500 dark:text-zinc-400">{transposeLabel}</span>
            )}
          </div>

          <div className="hidden items-center gap-3 overflow-x-auto pb-1 sm:flex">
            <div className="flex shrink-0 items-center rounded-xl border border-slate-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
              <button type="button" onClick={() => onTransposeChange?.(Math.max(-12, transpose - 1))} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-zinc-800 dark:hover:text-violet-400" aria-label="Transpose down">
                <Minus size={16} />
              </button>
              <div className="min-w-[92px] px-3 text-center">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">調性</div>
                <div className="font-mono text-base font-bold text-slate-900 dark:text-zinc-50">{currentKey}</div>
              </div>
              <button type="button" onClick={() => onTransposeChange?.(Math.min(12, transpose + 1))} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-zinc-800 dark:hover:text-violet-400" aria-label="Transpose up">
                <Plus size={16} />
              </button>
            </div>

            <div className={`shrink-0 text-xs leading-5 ${transpose === 0 ? 'text-slate-500 dark:text-zinc-400' : 'font-semibold text-indigo-600 dark:text-violet-400'}`}>{transposeLabel}</div>
            <div className="h-7 w-px shrink-0 bg-slate-200 dark:bg-zinc-800" />
            {hasCapo ? (
              <div className="flex shrink-0 items-center rounded-xl border border-slate-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900" role="group" aria-label="Capo 顯示">
                <Anchor size={14} className="mx-2 text-slate-400" />
                <button type="button" onClick={() => changeCapoMode('shape')} aria-pressed={!concert} className={`h-9 rounded-lg px-3 text-xs font-semibold transition-colors ${!concert ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'}`}>
                  Capo {capoLabel}・{shapeKeyLabel} 指型
                </button>
                <button type="button" onClick={() => changeCapoMode('concert')} aria-pressed={concert} className={`h-9 rounded-lg px-3 text-xs font-semibold transition-colors ${concert ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'}`}>
                  不夾 Capo・{concertKeyLabel} 調
                </button>
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-300"><Anchor size={14} className="text-slate-400" /> Capo {capoLabel}</div>
            )}
            <div className="hidden h-7 w-px shrink-0 bg-slate-200 dark:bg-zinc-800 sm:block" />
            <div className="hidden shrink-0 items-center rounded-xl bg-white p-1 dark:bg-zinc-900 sm:flex">
              <Type size={13} className="ml-2 text-slate-400" />
              <button type="button" onClick={() => setFontScale(scale => Math.max(0.8, Number((scale - 0.1).toFixed(1))))} className="grid h-8 w-8 place-items-center rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800" aria-label="Decrease score font size">A−</button>
              <button type="button" onClick={() => setFontScale(scale => Math.min(1.4, Number((scale + 0.1).toFixed(1))))} className="grid h-8 w-8 place-items-center rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800" aria-label="Increase score font size">A+</button>
            </div>
            <button type="button" onClick={() => { setShowChordPanel(value => !value); setMobilePanelOpen(false); }} className={`hidden shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors sm:flex ${showChordPanel ? 'bg-indigo-50 text-indigo-700 dark:bg-violet-950/50 dark:text-violet-300' : 'bg-white text-slate-500 dark:bg-zinc-900 dark:text-zinc-400'}`}>
              <PanelRight size={14} /> 和弦圖
            </button>
            <button type="button" onClick={toggleAutoScroll} className={`hidden shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors sm:flex ${autoScroll ? 'bg-slate-950 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'bg-white text-slate-600 hover:text-indigo-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-violet-400'}`}>
              {autoScroll ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              {autoScroll ? '暫停捲動' : '自動捲動'}
            </button>
            <label className={`hidden shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-opacity sm:flex ${autoScroll ? 'opacity-100' : 'opacity-45'}`}>
              速度
              <input type="range" min="0.5" max="2" step="0.25" value={scrollSpeed} disabled={!autoScroll} onChange={event => setScrollSpeed(Number(event.target.value))} className="w-20 accent-indigo-600 dark:accent-violet-500" />
              <span className="w-7 font-mono text-slate-600 dark:text-zinc-300">{scrollSpeed}x</span>
            </label>
            {transpose !== 0 && (
              <button type="button" onClick={() => onTransposeChange?.(0)} className="ml-auto flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"><RotateCcw size={13} /> 還原</button>
            )}
          </div>

          <div className="hidden items-center gap-2 overflow-x-auto sm:flex">
            <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">段落</span>
            {sections.map(section => (
              <button key={section.id} type="button" onClick={() => jumpToSection(section.id)} className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-white hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100">
                {section.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`mx-auto grid max-w-[1500px] grid-cols-1 gap-8 px-4 pb-48 pt-5 sm:px-6 sm:pb-32 sm:pt-8 lg:px-10 lg:pb-20 lg:pt-10 xl:gap-12 ${showChordPanel ? 'lg:grid-cols-[minmax(0,1fr)_300px]' : 'lg:grid-cols-1'}`}>
        <div className="min-w-0">
          {chordNames.length > 0 && (
            <section className="mb-5 border-b border-slate-200 pb-3 dark:border-zinc-800 sm:mb-12 sm:pb-8 print:hidden">
              <div className="flex items-center justify-between gap-3 sm:mb-4">
                <button type="button" onClick={() => setMobileOverviewOpen(open => !open)} aria-expanded={mobileOverviewOpen} aria-label="本曲和弦" className="flex min-h-9 items-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-300 sm:hidden"><Layers3 size={15} className="text-indigo-500 dark:text-violet-400" />本曲和弦 · {chordNames.length}<ChevronDown size={14} className={mobileOverviewOpen ? 'rotate-180' : ''} /></button>
                <div className="hidden items-center gap-2 sm:flex"><Layers3 size={15} className="text-indigo-500 dark:text-violet-400" /><h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">本曲和弦</h2></div>
                <button type="button" onClick={() => setSwitchTrainerOpen(true)} disabled={chordNames.length < 2} className="ml-auto flex h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-[#2b6c59] transition-colors hover:border-emerald-300 disabled:opacity-40 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300 sm:ml-0 sm:h-auto sm:py-2">
                  <ArrowLeftRight size={14} /> 換和弦練習
                </button>
                {canEditVoicings && (
                  <button type="button" onClick={() => setPlannerOpen(true)} className="hidden items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:border-violet-800 dark:hover:bg-violet-950/70 sm:flex">
                    <Sparkles size={14} /> 自動配置
                  </button>
                )}
              </div>
              <div className={`${mobileOverviewOpen ? 'flex' : 'hidden'} flex-wrap gap-2 pt-3 sm:flex sm:pt-0`}>
                {chordNames.map(name => {
                  const displayName = displayChord(name) ?? name;
                  const isActive = selectedChord === name;
                  return (
                    <button key={name} type="button" onClick={() => chooseChord(name)} className={`flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-sm font-semibold transition-all sm:min-h-0 sm:min-w-0 ${isActive ? 'bg-indigo-50 text-indigo-700 dark:bg-violet-950/40 dark:text-violet-300' : 'text-slate-600 underline-offset-4 hover:text-indigo-600 hover:underline dark:text-zinc-300 dark:hover:text-violet-400'}`}>
                      {displayName}{voicingPlan[name] && <Check size={11} strokeWidth={3} aria-label="已配置指法" />}
                    </button>
                  );
                })}
                {canEditVoicings && <button type="button" onClick={() => setPlannerOpen(true)} className="rounded-lg border border-indigo-200 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:border-violet-900 dark:text-violet-300 sm:hidden">自動配置</button>}
              </div>
            </section>
          )}

          <SongFormBar sections={sections} form={form} currentStep={playState?.step ?? null} onChange={onFormChange} onJump={onJumpToStep} />

          <div className="space-y-10 sm:space-y-16">
            {renderedSections.map((section, sectionIndex) => (
              <section key={section.id} id={sectionAnchor(section.id)} className="scroll-mt-36">
                <header className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-slate-200 pb-3 dark:border-zinc-800 sm:mb-6 sm:pb-4">
                  <div><div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-zinc-500">第 {sectionIndex + 1} 段</div><h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">{section.title}</h2></div>
                  <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 sm:gap-3">{onSectionPatternChange && <PatternPicker sectionTitle={section.title} value={section.pattern ?? ''} onChange={pattern => onSectionPatternChange(section.id, pattern)} onApplyToAll={pattern => onSectionPatternChange(null, pattern)} />}{onLoopSection && <button type="button" onClick={() => onLoopSection(sectionIndex)} aria-pressed={loopedSectionIdx === sectionIndex} className={`flex h-11 items-center gap-1.5 rounded-xl px-3 normal-case tracking-normal transition-colors sm:h-9 print:hidden ${loopedSectionIdx === sectionIndex ? 'bg-[#2b6c59] text-white' : 'border border-slate-200 text-slate-600 hover:border-[#2b6c59] hover:text-[#2b6c59] dark:border-zinc-700 dark:text-zinc-300'}`}><Repeat size={13} />{loopedSectionIdx === sectionIndex ? '循環中' : '循環這段'}</button>}<span>{section.timeSignature?.join('/') ?? '4/4'}</span>{section.capo > 0 && <span>{concert ? `不夾 Capo（原 Capo ${section.capo}）` : `Capo ${section.capo}`}</span>}</div>
                </header>

                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-zinc-800 dark:bg-zinc-800 md:grid-cols-4" data-testid="songbook-section">
                  {section.measures.map((_, measureIndex) => {
                    const playbackActive = playState?.sectionIdx === sectionIndex && playState.measureIdx === measureIndex;
                    return (
                      <div key={measureIndex} id={`preview-measure-${sectionIndex}-${measureIndex}`} className="scroll-mt-40">
                        <LeadSheetMeasure
                          measureNumber={measureIndex + 1}
                          chords={section.chords[measureIndex] ?? []}
                          displayChords={section.displayChords[measureIndex] ?? []}
                          lyrics={section.lyrics[measureIndex] ?? []}
                          selectedChord={selectedChord}
                          fontScale={fontScale}
                          onSelectChord={chooseChord}
                          activeColumn={playbackActive ? playState?.colIdx : null}
                          playbackActive={playbackActive}
                        />
                      </div>
                    );
                  })}
                  {/* Fill the last row so the bar lines stay a clean grid. */}
                  {Array.from({ length: (4 - (section.measures.length % 4)) % 4 }, (_, index) => (
                    <div key={`filler-${index}`} className="bg-white dark:bg-zinc-900" aria-hidden="true" />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {showChordPanel && <aside className="hidden lg:block print:hidden">
          <div className="sticky top-36 max-h-[calc(100vh-10rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900">
            <ChordWorkspacePanel sourceSymbol={selectedChord} symbol={selectedDisplayChord} chordLibrary={chordLibrary} theme={theme} preference={selectedChord && !concert ? voicingPlan[selectedChord] : undefined} onPreferenceChange={canEditVoicings ? updateSelectedPreference : undefined} />
          </div>
        </aside>}
      </div>

      {mobilePanelOpen && selectedDisplayChord && (
        <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/35 backdrop-blur-[2px] lg:hidden print:hidden" onClick={() => setMobilePanelOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label={`${selectedDisplayChord} 和弦按法`} className="max-h-[88vh] w-full overflow-y-auto rounded-t-[28px] border-t border-slate-200 bg-white pt-3 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900" onClick={event => event.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 dark:bg-zinc-700" />
            <ChordWorkspacePanel sourceSymbol={selectedChord} symbol={selectedDisplayChord} chordLibrary={chordLibrary} theme={theme} preference={selectedChord && !concert ? voicingPlan[selectedChord] : undefined} onPreferenceChange={canEditVoicings ? updateSelectedPreference : undefined} compact onClose={() => setMobilePanelOpen(false)} />
          </div>
        </div>
      )}

      {switchTrainerOpen && (
        <ChordSwitchTrainer
          chords={chordNames}
          displayChord={name => displayChord(name) ?? name}
          chordLibrary={chordLibrary}
          voicingPlan={voicingPlan}
          theme={theme}
          onClose={() => setSwitchTrainerOpen(false)}
        />
      )}

      {plannerOpen && onVoicingPlanChange && canEditVoicings && (
        <VoicingPlanReview
          sections={sections}
          chordLibrary={chordLibrary}
          existingPlan={voicingPlan}
          transposeOffset={transpose}
          theme={theme}
          onApply={onVoicingPlanChange}
          onClose={() => setPlannerOpen(false)}
        />
      )}
    </div>
  );
};

export default SongPreview;
