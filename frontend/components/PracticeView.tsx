import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Focus, ZoomIn, ZoomOut } from 'lucide-react';
import ScoreLine from './ScoreLine';
import { TabSection } from '../types';
import {
  DEFAULT_PRACTICE_ZOOM,
  PRACTICE_ZOOM_LEVELS,
  PRACTICE_ZOOM_STORAGE_KEY,
  PracticeZoom,
  formatTimeSignature,
} from '../constants/practice';

interface PracticeViewProps {
  sections: TabSection[];
  activeSectionId: string;
  playState: { sectionIdx: number; measureIdx: number; colIdx: number } | null;
  theme: 'light' | 'dark';
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
  onSelectSection,
  onSelectCell,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastAutoScrollKeyRef = useRef<string | null>(null);
  const [zoom, setZoom] = useState<PracticeZoom>(loadStoredZoom);

  useEffect(() => {
    localStorage.setItem(PRACTICE_ZOOM_STORAGE_KEY, String(zoom));
  }, [zoom]);

  const rows = useMemo(
    () => sections.map((section, sectionIdx) => ({ section, sectionIdx })),
    [sections]
  );

  useEffect(() => {
    if (!playState) {
      lastAutoScrollKeyRef.current = null;
      return;
    }

    const key = `${playState.sectionIdx}:${playState.measureIdx}`;
    if (lastAutoScrollKeyRef.current === key) return;

    const container = containerRef.current;
    if (!container) return;

    const el = container.querySelector<HTMLElement>(`[data-play-key="${key}"]`);
    if (!el) return;

    lastAutoScrollKeyRef.current = key;
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }, [playState]);

  const zoomOut = () => {
    const idx = PRACTICE_ZOOM_LEVELS.indexOf(zoom);
    if (idx > 0) setZoom(PRACTICE_ZOOM_LEVELS[idx - 1]);
  };

  const zoomIn = () => {
    const idx = PRACTICE_ZOOM_LEVELS.indexOf(zoom);
    if (idx < PRACTICE_ZOOM_LEVELS.length - 1) setZoom(PRACTICE_ZOOM_LEVELS[idx + 1]);
  };

  const jumpToSection = (sectionId: string) => {
    onSelectSection?.(sectionId);
    containerRef.current
      ?.querySelector<HTMLElement>(`[data-section-id="${sectionId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-[#f4f4f1] dark:bg-zinc-950 transition-colors duration-250"
    >
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-3 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          <span className="mr-1 hidden items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400 sm:flex"><Focus size={13} /> Jump to</span>
          {sections.map(section => (
            <button
              key={section.id}
              type="button"
              onClick={() => jumpToSection(section.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${section.id === activeSectionId ? 'bg-slate-950 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-900'}`}
            >
              {section.title}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={zoomOut}
          disabled={zoom === PRACTICE_ZOOM_LEVELS[0]}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-900"
          title="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <div className="hidden items-center gap-1 md:flex">
          {PRACTICE_ZOOM_LEVELS.map(level => (
            <button
              key={level}
              type="button"
              onClick={() => setZoom(level)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                zoom === level
                  ? 'bg-indigo-50 dark:bg-violet-900/40 text-indigo-600 dark:text-violet-400 border border-indigo-200 dark:border-violet-800'
                  : 'text-slate-500 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-violet-400 border border-transparent'
              }`}
            >
              {level}%
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={zoomIn}
          disabled={zoom === PRACTICE_ZOOM_LEVELS[PRACTICE_ZOOM_LEVELS.length - 1]}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-900"
          title="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        </div>
      </div>

      <div className="p-4 pb-28 sm:p-8 sm:pb-28">
        <div
          className="max-w-6xl mx-auto space-y-10 origin-top transition-transform duration-200"
          style={{ transform: `scale(${zoom / 100})`, width: `${10000 / zoom}%` }}
        >
          {rows.map(({ section, sectionIdx }) => {
            const isActive = section.id === activeSectionId;
            const ts = section.timeSignature ?? [4, 4];
            return (
              <div key={section.id} data-section-id={section.id} className="scroll-mt-20 space-y-4">
                <button
                  onClick={() => onSelectSection?.(section.id)}
                  className={`w-full border-l-2 bg-transparent px-4 py-2 text-left transition-all ${
                    isActive
                      ? 'border-indigo-500 text-indigo-700 dark:border-violet-400 dark:text-violet-300'
                      : 'border-slate-300 text-slate-700 hover:border-slate-500 dark:border-zinc-700 dark:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-extrabold tracking-tight">{section.title}</div>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                      <span>{formatTimeSignature(ts)}</span>
                      <span>Capo {section.capo || 0}</span>
                    </div>
                  </div>
                </button>

                <div className="flex flex-wrap gap-6">
                  {section.measures.map((measure, measureIdx) => {
                    const isSecPlaying = playState?.sectionIdx === sectionIdx;
                    const isMeasPlaying = isSecPlaying && playState?.measureIdx === measureIdx;
                    const playKey = `${sectionIdx}:${measureIdx}`;
                    return (
                      <ScoreLine
                        key={measureIdx}
                        className="w-full lg:w-[calc(50%-12px)]"
                        playKey={playKey}
                        measure={measure}
                        chords={section.chords[measureIdx]}
                        lyrics={section.lyrics[measureIdx]}
                        playCol={isMeasPlaying ? playState!.colIdx : null}
                        theme={theme}
                        onSelectCell={(stringIdx, colIdx) =>
                          onSelectCell?.(section.id, measureIdx, stringIdx, colIdx)
                        }
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PracticeView;
