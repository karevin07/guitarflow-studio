import React, { useEffect, useMemo, useRef } from 'react';
import TabMeasure from './TabMeasure';
import { TabSection } from '../types';

interface PracticeViewProps {
  sections: TabSection[];
  activeSectionId: string;
  playState: { sectionIdx: number; measureIdx: number; colIdx: number } | null;
  theme: 'light' | 'dark';
  onSelectSection?: (sectionId: string) => void;
  onSelectCell?: (sectionId: string, measureIdx: number, stringIdx: number, colIdx: number) => void;
}

const noop = () => {};

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

  const rows = useMemo(() => {
    return sections.map((section, sectionIdx) => {
      return {
        section,
        sectionIdx,
      };
    });
  }, [sections]);

  useEffect(() => {
    if (!playState) {
      lastAutoScrollKeyRef.current = null;
      return;
    }

    // Only scroll when entering a new measure (not on every column tick).
    const key = `${playState.sectionIdx}:${playState.measureIdx}`;
    if (lastAutoScrollKeyRef.current === key) return;

    const container = containerRef.current;
    if (!container) return;

    const el = container.querySelector<HTMLElement>(`[data-play-key="${key}"]`);
    if (!el) return;

    lastAutoScrollKeyRef.current = key;

    // Smoothly keep the playing measure near the center of the viewport.
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }, [playState]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-slate-100 dark:bg-zinc-950 p-8 transition-colors duration-250"
    >
      <div className="max-w-6xl mx-auto space-y-10 pb-28">
        {rows.map(({ section, sectionIdx }) => {
          const isActive = section.id === activeSectionId;
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
                <div className="flex items-center justify-between">
                  <div className="text-sm font-extrabold tracking-tight">{section.title}</div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                    Capo {section.capo || 0}
                  </div>
                </div>
              </button>

              <div className="flex flex-wrap gap-6">
                {section.measures.map((measure, measureIdx) => {
                  const isSecPlaying = playState?.sectionIdx === sectionIdx;
                  const isMeasPlaying = isSecPlaying && playState?.measureIdx === measureIdx;
                  const playKey = `${sectionIdx}:${measureIdx}`;
                  return (
                    <div
                      key={measureIdx}
                      className="w-full lg:w-[calc(50%-12px)]"
                      data-play-key={playKey}
                    >
                      <TabMeasure
                        measure={measure}
                        chords={section.chords[measureIdx]}
                        lyrics={section.lyrics[measureIdx]}
                        activeCol={null}
                        activeString={null}
                        playCol={isMeasPlaying ? playState!.colIdx : null}
                        onCellClick={(stringIdx, colIdx) => onSelectCell?.(section.id, measureIdx, stringIdx, colIdx)}
                        onChordClick={() => {}}
                        onChordNameChange={noop}
                        onLyricChange={noop}
                        onDelete={undefined}
                        onCopy={undefined}
                        onClearColumn={undefined}
                        onDropChord={undefined}
                        canDelete={false}
                        theme={theme}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PracticeView;

