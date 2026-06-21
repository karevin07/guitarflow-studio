import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
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

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-slate-100 dark:bg-zinc-950 transition-colors duration-250"
    >
      <div className="sticky top-0 z-10 flex items-center justify-end gap-2 px-8 py-3 bg-slate-100/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200/60 dark:border-zinc-800/60">
        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mr-1">
          Zoom
        </span>
        <button
          type="button"
          onClick={zoomOut}
          disabled={zoom === PRACTICE_ZOOM_LEVELS[0]}
          className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:border-indigo-300 dark:hover:border-violet-700 disabled:opacity-30 transition-all"
          title="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <div className="flex items-center gap-1">
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
          className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:border-indigo-300 dark:hover:border-violet-700 disabled:opacity-30 transition-all"
          title="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      <div className="p-8 pb-28">
        <div
          className="max-w-6xl mx-auto space-y-10 origin-top transition-transform duration-200"
          style={{ transform: `scale(${zoom / 100})`, width: `${10000 / zoom}%` }}
        >
          {rows.map(({ section, sectionIdx }) => {
            const isActive = section.id === activeSectionId;
            const ts = section.timeSignature ?? [4, 4];
            return (
              <div key={section.id} className="space-y-4">
                <button
                  onClick={() => onSelectSection?.(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border backdrop-blur-md transition-all ${
                    isActive
                      ? 'bg-white/80 dark:bg-zinc-900/30 border-indigo-500/50 dark:border-violet-500/40 text-indigo-700 dark:text-violet-300'
                      : 'bg-white/60 dark:bg-zinc-900/15 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:border-indigo-500/30 dark:hover:border-violet-500/30'
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
