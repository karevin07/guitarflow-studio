import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ChevronDown, Focus, Gauge, Repeat2, TimerReset, ZoomIn, ZoomOut } from 'lucide-react';
import { ChordDefinition, TabSection } from '../types';
import {
  DEFAULT_PRACTICE_ZOOM,
  PRACTICE_ZOOM_LEVELS,
  PRACTICE_ZOOM_STORAGE_KEY,
  PracticeZoom,
  formatTimeSignature,
} from '../constants/practice';
import LeadSheetMeasure from './LeadSheetMeasure';
import ChordWorkspacePanel from './ChordWorkspacePanel';
import { chordAtPosition } from '../services/progression';

interface PracticeViewProps {
  sections: TabSection[];
  activeSectionId: string;
  playState: { sectionIdx: number; measureIdx: number; colIdx: number } | null;
  theme: 'light' | 'dark';
  chordLibrary?: ChordDefinition[];
  onSelectSection?: (sectionId: string) => void;
  onSelectCell?: (sectionId: string, measureIdx: number, stringIdx: number, colIdx: number) => void;
}

const loadStoredZoom = (): PracticeZoom => {
  const raw = localStorage.getItem(PRACTICE_ZOOM_STORAGE_KEY);
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return (PRACTICE_ZOOM_LEVELS as readonly number[]).includes(parsed)
    ? (parsed as PracticeZoom)
    : DEFAULT_PRACTICE_ZOOM;
};

const PracticeView: React.FC<PracticeViewProps> = ({
  sections,
  activeSectionId,
  playState,
  theme,
  chordLibrary = [],
  onSelectSection,
  onSelectCell,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastAutoScrollKeyRef = useRef<string | null>(null);
  const [zoom, setZoom] = useState<PracticeZoom>(loadStoredZoom);
  const [selectedChord, setSelectedChord] = useState<string | null>(null);
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);

  const playingChord = useMemo(() => chordAtPosition(sections, playState), [playState, sections]);
  const fallbackChord = useMemo(
    () => sections.flatMap(section => section.chords.flat()).find(Boolean) ?? null,
    [sections]
  );
  const inspectedChord = selectedChord ?? playingChord ?? fallbackChord;
  const activeSection = playState ? sections[playState.sectionIdx] : sections.find(section => section.id === activeSectionId);

  useEffect(() => {
    localStorage.setItem(PRACTICE_ZOOM_STORAGE_KEY, String(zoom));
  }, [zoom]);

  useEffect(() => {
    if (!playState) {
      lastAutoScrollKeyRef.current = null;
      return;
    }
    const key = `${playState.sectionIdx}:${playState.measureIdx}`;
    if (lastAutoScrollKeyRef.current === key) return;
    const target = containerRef.current?.querySelector<HTMLElement>(`[data-play-key="${key}"]`);
    if (!target) return;
    lastAutoScrollKeyRef.current = key;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [playState]);

  const nudgeZoom = (direction: -1 | 1) => {
    const index = PRACTICE_ZOOM_LEVELS.indexOf(zoom);
    const next = PRACTICE_ZOOM_LEVELS[index + direction];
    if (next) setZoom(next);
  };

  const jumpToSection = (sectionId: string) => {
    onSelectSection?.(sectionId);
    setSectionMenuOpen(false);
    containerRef.current?.querySelector<HTMLElement>(`[data-section-id="${sectionId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto bg-[#f7f5ef] pb-32 dark:bg-[#151616]">
      <div className="sticky top-0 z-30 border-b border-[#dedcd4] bg-[#fffefa]/95 backdrop-blur-xl dark:border-zinc-800 dark:bg-[#171818]/95">
        <div className="mx-auto flex max-w-[1440px] items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-10">
          <div className="relative shrink-0">
            <button type="button" onClick={() => setSectionMenuOpen(open => !open)} className="flex h-10 items-center gap-2 rounded-xl border border-[#dedcd4] bg-white px-3 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-900">
              <Focus size={14} className="text-[#2b6c59]" />
              <span>{activeSection?.title ?? '選擇段落'}</span>
              <ChevronDown size={13} />
            </button>
            {sectionMenuOpen && <div className="absolute left-0 top-12 z-50 min-w-48 rounded-xl border border-[#dedcd4] bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">{sections.map(section => <button key={section.id} type="button" onClick={() => jumpToSection(section.id)} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#efede7] dark:hover:bg-zinc-800">{section.title}</button>)}</div>}
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-xl bg-[#e8f0eb] px-3 py-2 text-[10px] font-semibold text-[#2b6c59] dark:bg-emerald-950/40 dark:text-emerald-300"><Activity size={14} />{playState ? `第 ${playState.measureIdx + 1} 小節 · ${playingChord ?? '—'}` : '準備開始'}</div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-[#dedcd4] px-3 py-2 text-[10px] font-semibold text-[#6e716b] dark:border-zinc-800 dark:text-zinc-400"><Gauge size={14} />120 BPM</div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-[#dedcd4] px-3 py-2 text-[10px] font-semibold text-[#6e716b] dark:border-zinc-800 dark:text-zinc-400"><Repeat2 size={14} />A–B 循環</div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-[#dedcd4] px-3 py-2 text-[10px] font-semibold text-[#6e716b] dark:border-zinc-800 dark:text-zinc-400"><TimerReset size={14} />預備 2 小節</div>
          <div className="ml-auto flex shrink-0 items-center gap-1 rounded-xl bg-[#efede7] p-1 dark:bg-zinc-900">
            <button type="button" onClick={() => nudgeZoom(-1)} disabled={zoom === PRACTICE_ZOOM_LEVELS[0]} className="grid h-8 w-8 place-items-center rounded-lg text-[#777a73] hover:bg-white disabled:opacity-30 dark:hover:bg-zinc-800" aria-label="縮小譜面"><ZoomOut size={15} /></button>
            <span className="w-10 text-center font-mono text-[9px] font-semibold text-[#6e716b]">{zoom}%</span>
            <button type="button" onClick={() => nudgeZoom(1)} disabled={zoom === PRACTICE_ZOOM_LEVELS[PRACTICE_ZOOM_LEVELS.length - 1]} className="grid h-8 w-8 place-items-center rounded-lg text-[#777a73] hover:bg-white disabled:opacity-30 dark:hover:bg-zinc-800" aria-label="放大譜面"><ZoomIn size={15} /></button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-10 xl:gap-12">
        <div className="min-w-0 space-y-14" style={{ fontSize: `${zoom}%` }}>
          {sections.map((section, sectionIdx) => {
            const isSectionPlaying = playState?.sectionIdx === sectionIdx;
            return (
              <section key={section.id} data-section-id={section.id} className="scroll-mt-28">
                <header className="mb-5 flex items-end justify-between gap-4 border-b border-[#dedcd4] pb-4 dark:border-zinc-800">
                  <div><div className={`mb-1 text-[9px] font-semibold uppercase tracking-[0.2em] ${isSectionPlaying ? 'text-[#2b6c59]' : 'text-[#85877f]'}`}>{isSectionPlaying ? '● Playing' : `Section ${String(sectionIdx + 1).padStart(2, '0')}`}</div><h2 className="text-2xl font-bold tracking-[-0.03em]">{section.title}</h2></div>
                  <div className="flex gap-3 font-mono text-[9px] text-[#85877f]"><span>{formatTimeSignature(section.timeSignature ?? [4, 4])}</span><span>Capo {section.capo}</span></div>
                </header>
                <div className="overflow-hidden rounded-2xl border border-[#dedcd4] bg-[#fffefa] dark:border-zinc-800 dark:bg-zinc-900">
                  {section.measures.map((_, measureIdx) => {
                    const isPlaying = isSectionPlaying && playState?.measureIdx === measureIdx;
                    const isComplete = isSectionPlaying && playState && measureIdx < playState.measureIdx;
                    return (
                      <div key={measureIdx} data-play-key={`${sectionIdx}:${measureIdx}`} className={`relative transition-colors ${isPlaying ? 'bg-[#edf4ef] dark:bg-emerald-950/20' : isComplete ? 'opacity-55' : ''}`}>
                        {isPlaying && <span className="absolute inset-y-0 left-0 z-10 w-1 bg-[#2b6c59]" />}
                        <LeadSheetMeasure
                          measureNumber={measureIdx + 1}
                          chords={section.chords[measureIdx] ?? []}
                          displayChords={section.chords[measureIdx] ?? []}
                          lyrics={section.lyrics[measureIdx] ?? []}
                          selectedChord={inspectedChord}
                          fontScale={1}
                          onSelectChord={name => {
                            setSelectedChord(name);
                            const column = section.chords[measureIdx]?.findIndex(value => value === name) ?? -1;
                            if (column >= 0) onSelectCell?.(section.id, measureIdx, 0, column);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-[#dedcd4] bg-[#fffefa] dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-[#dedcd4] px-5 py-4 dark:border-zinc-800"><div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#2b6c59]">當前和弦與指法</div><div className="mt-1 text-xs text-[#85877f]">{playingChord && inspectedChord !== playingChord ? `正在播放 ${playingChord}` : '點擊譜面和弦可切換'}</div></div>
            <ChordWorkspacePanel symbol={inspectedChord} chordLibrary={chordLibrary} theme={theme} />
            {playingChord && <div className="border-t border-[#dedcd4] bg-[#f4f1e9] p-5 dark:border-zinc-800 dark:bg-zinc-950"><div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#85877f]">Transition coach</div><div className="mt-2 text-sm font-semibold">下一個和弦會在目前小節後切換</div><p className="mt-2 text-xs leading-5 text-[#6e716b] dark:text-zinc-400">先放鬆手腕，再以共同指位作為移動基準；保持節拍比搶拍更重要。</p></div>}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PracticeView;
