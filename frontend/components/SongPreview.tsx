import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Anchor, Layers3, Minus, PanelRight, Pause, Play, Plus, RotateCcw, Type } from 'lucide-react';
import { TabSection, ChordDefinition } from '../types';
import { PlaybackPosition } from '../types/playback';
import { formatPitch, parseChord, transposeChordSymbol, transposePitch } from '../music-theory';
import ChordWorkspacePanel from './ChordWorkspacePanel';
import LeadSheetMeasure from './LeadSheetMeasure';

interface SongPreviewProps {
  sections: TabSection[];
  customChords?: ChordDefinition[];
  globalChords?: ChordDefinition[];
  externalTranspose?: number;
  onTransposeChange?: (newVal: number) => void;
  theme?: 'light' | 'dark';
  playState?: PlaybackPosition | null;
  isPlaying?: boolean;
  isPaused?: boolean;
  onTogglePlayPause?: () => void;
}

const sectionAnchor = (id: string): string => `preview-section-${id}`;
const AUTO_SCROLL_SPEED_KEY = 'guitarflow-auto-scroll-speed';
const SCORE_FONT_SCALE_KEY = 'guitarflow-read-font-scale';

const SongPreview: React.FC<SongPreviewProps> = ({
  sections,
  customChords = [],
  globalChords = [],
  externalTranspose = 0,
  onTransposeChange,
  theme = 'dark',
  playState = null,
  isPlaying = false,
  isPaused = false,
  onTogglePlayPause,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [selectedChord, setSelectedChord] = useState<string | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [showChordPanel, setShowChordPanel] = useState(true);
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
        scroller.scrollTop += ((time - previousTime) / 1000) * 28 * scrollSpeed;
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

  const renderedSections = useMemo(() => sections.map(section => ({
    ...section,
    displayChords: section.chords.map(measure =>
      measure.map(name => transposeChordSymbol(name, transpose))
    ),
  })), [sections, transpose]);

  const baseChord = chordNames.map(parseChord).find(chord => chord !== null) ?? null;
  const originalKey = baseChord ? formatPitch(baseChord.root, baseChord.accidentalPreference) : '—';
  const currentKey = baseChord
    ? formatPitch(transposePitch(baseChord.root, transpose), baseChord.accidentalPreference)
    : '—';
  const selectedDisplayChord = transposeChordSymbol(selectedChord, transpose);
  const capoValues = Array.from(new Set(sections.map(section => section.capo).filter(Boolean)));
  const capoLabel = capoValues.length === 0 ? '0' : capoValues.length === 1 ? String(capoValues[0]) : 'Varies';

  const chooseChord = (name: string) => {
    setSelectedChord(name);
    if (showChordPanel) setMobilePanelOpen(true);
  };

  return (
    <div ref={rootRef} className="min-h-full bg-[#f6f6f3] text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="sticky top-0 z-30 border-b border-slate-200/90 bg-[#f6f6f3]/95 px-4 py-3 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-6 lg:px-10 print:hidden">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3">
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {onTogglePlayPause && (
              <button type="button" onClick={onTogglePlayPause} className={`flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-semibold text-white transition-colors ${isPlaying ? 'bg-[#2b6c59] hover:bg-[#245c4c]' : 'bg-[#1b1c1e] hover:bg-[#3154d7] dark:bg-zinc-100 dark:text-zinc-950'}`} aria-label={isPlaying ? '暫停播放' : isPaused ? '繼續播放' : '開始播放'}>
                {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                {isPlaying ? '暫停' : isPaused ? '繼續' : '播放'}
              </button>
            )}
            <div className="flex shrink-0 items-center rounded-xl border border-slate-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
              <button type="button" onClick={() => onTransposeChange?.(Math.max(-12, transpose - 1))} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-zinc-800 dark:hover:text-violet-400" aria-label="Transpose down">
                <Minus size={16} />
              </button>
              <div className="min-w-[92px] px-3 text-center">
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Key</div>
                <div className="font-mono text-base font-bold text-slate-900 dark:text-zinc-50">{currentKey}</div>
              </div>
              <button type="button" onClick={() => onTransposeChange?.(Math.min(12, transpose + 1))} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-zinc-800 dark:hover:text-violet-400" aria-label="Transpose up">
                <Plus size={16} />
              </button>
            </div>

            <div className="shrink-0 text-xs leading-5 text-slate-500 dark:text-zinc-400">
              <span>Original {originalKey}</span>
              <span className="mx-2 text-slate-300 dark:text-zinc-700">·</span>
              <span className={transpose === 0 ? '' : 'font-semibold text-indigo-600 dark:text-violet-400'}>{transpose > 0 ? `+${transpose}` : transpose}</span>
            </div>
            <div className="h-7 w-px shrink-0 bg-slate-200 dark:bg-zinc-800" />
            <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-300"><Anchor size={14} className="text-slate-400" /> Capo {capoLabel}</div>
            <div className="hidden h-7 w-px shrink-0 bg-slate-200 dark:bg-zinc-800 sm:block" />
            <div className="hidden shrink-0 items-center rounded-xl bg-white p-1 dark:bg-zinc-900 sm:flex">
              <Type size={13} className="ml-2 text-slate-400" />
              <button type="button" onClick={() => setFontScale(scale => Math.max(0.8, Number((scale - 0.1).toFixed(1))))} className="grid h-8 w-8 place-items-center rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800" aria-label="Decrease score font size">A−</button>
              <button type="button" onClick={() => setFontScale(scale => Math.min(1.4, Number((scale + 0.1).toFixed(1))))} className="grid h-8 w-8 place-items-center rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800" aria-label="Increase score font size">A+</button>
            </div>
            <button type="button" onClick={() => { setShowChordPanel(value => !value); setMobilePanelOpen(false); }} className={`hidden shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors sm:flex ${showChordPanel ? 'bg-indigo-50 text-indigo-700 dark:bg-violet-950/50 dark:text-violet-300' : 'bg-white text-slate-500 dark:bg-zinc-900 dark:text-zinc-400'}`}>
              <PanelRight size={14} /> Chord diagrams
            </button>
            <button type="button" onClick={() => setAutoScroll(value => !value)} className={`hidden shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors sm:flex ${autoScroll ? 'bg-slate-950 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'bg-white text-slate-600 hover:text-indigo-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-violet-400'}`}>
              {autoScroll ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              {autoScroll ? 'Pause scroll' : 'Auto scroll'}
            </button>
            <label className={`hidden shrink-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 transition-opacity sm:flex ${autoScroll ? 'opacity-100' : 'opacity-45'}`}>
              Speed
              <input type="range" min="0.5" max="2" step="0.25" value={scrollSpeed} disabled={!autoScroll} onChange={event => setScrollSpeed(Number(event.target.value))} className="w-20 accent-indigo-600 dark:accent-violet-500" />
              <span className="w-7 font-mono text-slate-600 dark:text-zinc-300">{scrollSpeed}x</span>
            </label>
            {transpose !== 0 && (
              <button type="button" onClick={() => onTransposeChange?.(0)} className="ml-auto flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"><RotateCcw size={13} /> Reset</button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="mr-1 shrink-0 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Sections</span>
            {sections.map(section => (
              <button key={section.id} type="button" onClick={() => document.getElementById(sectionAnchor(section.id))?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-white hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100">
                {section.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`mx-auto grid max-w-[1500px] grid-cols-1 gap-8 px-4 pb-32 pt-8 sm:px-6 lg:px-10 lg:pb-20 lg:pt-10 xl:gap-12 ${showChordPanel ? 'lg:grid-cols-[minmax(0,1fr)_300px]' : 'lg:grid-cols-1'}`}>
        <div className="min-w-0">
          {chordNames.length > 0 && (
            <section className="mb-12 border-b border-slate-200 pb-8 dark:border-zinc-800 print:hidden">
              <div className="mb-4 flex items-center gap-2"><Layers3 size={15} className="text-indigo-500 dark:text-violet-400" /><h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">Chords used</h2></div>
              <div className="flex flex-wrap gap-2">
                {chordNames.map(name => {
                  const displayName = transposeChordSymbol(name, transpose) ?? name;
                  const isActive = selectedChord === name;
                  return (
                    <button key={name} type="button" onClick={() => chooseChord(name)} className={`rounded-lg px-2.5 py-1.5 font-mono text-sm font-semibold transition-all ${isActive ? 'bg-indigo-50 text-indigo-700 dark:bg-violet-950/40 dark:text-violet-300' : 'text-slate-600 underline-offset-4 hover:text-indigo-600 hover:underline dark:text-zinc-300 dark:hover:text-violet-400'}`}>
                      {displayName}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <div className="space-y-16">
            {renderedSections.map((section, sectionIndex) => (
              <section key={section.id} id={sectionAnchor(section.id)} className="scroll-mt-36">
                <header className="mb-6 flex items-end justify-between gap-4 border-b border-slate-200 pb-4 dark:border-zinc-800">
                  <div><div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-zinc-500">Section {String(sectionIndex + 1).padStart(2, '0')}</div><h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">{section.title}</h2></div>
                  <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500"><span>{section.timeSignature?.join('/') ?? '4/4'}</span>{section.capo > 0 && <span>Capo {section.capo}</span>}</div>
                </header>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-zinc-800 dark:bg-zinc-900/45">
                  {section.measures.map((_, measureIndex) => {
                    const playbackActive = playState?.sectionIdx === sectionIndex && playState.measureIdx === measureIndex;
                    return <div key={measureIndex} id={`preview-measure-${sectionIndex}-${measureIndex}`} className="scroll-mt-40">
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
                    </div>;
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>

        {showChordPanel && <aside className="hidden lg:block print:hidden">
          <div className="sticky top-36 max-h-[calc(100vh-10rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900">
            <ChordWorkspacePanel symbol={selectedDisplayChord} chordLibrary={chordLibrary} theme={theme} />
          </div>
        </aside>}
      </div>

      <div className="fixed bottom-[148px] right-4 z-40 flex items-center gap-2 sm:hidden print:hidden">
        {autoScroll && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/95">
            <button type="button" onClick={() => setScrollSpeed(speed => Math.max(0.5, speed - 0.25))} className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800" aria-label="Slower auto scroll"><Minus size={13} /></button>
            <span className="w-8 text-center font-mono text-[10px] font-semibold">{scrollSpeed}x</span>
            <button type="button" onClick={() => setScrollSpeed(speed => Math.min(2, speed + 0.25))} className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800" aria-label="Faster auto scroll"><Plus size={13} /></button>
          </div>
        )}
        <button type="button" onClick={() => setAutoScroll(value => !value)} className={`flex h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold shadow-lg backdrop-blur-xl ${autoScroll ? 'bg-slate-950 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'border border-slate-200 bg-white/95 text-slate-700 dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-200'}`}>
          {autoScroll ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          Scroll
        </button>
      </div>

      {mobilePanelOpen && selectedDisplayChord && (
        <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/35 backdrop-blur-[2px] lg:hidden print:hidden" onClick={() => setMobilePanelOpen(false)}>
          <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-[28px] border-t border-slate-200 bg-white pt-3 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900" onClick={event => event.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 dark:bg-zinc-700" />
            <ChordWorkspacePanel symbol={selectedDisplayChord} chordLibrary={chordLibrary} theme={theme} compact onClose={() => setMobilePanelOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SongPreview;
