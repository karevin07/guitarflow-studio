import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Music4, Search, Sparkles } from 'lucide-react';
import { ChordDefinition, SongVoicingPlan, TabSection } from '../types';
import { PlaybackPosition } from '../types/playback';
import { MusicalKey, PitchClass, detectKey, formatKey, parseChord, toPitchClass } from '../music-theory';
import { sectionChordSteps, stepIndexAt } from '../services/progression';
import ArrangeExplorer, { ParsedStep } from './ArrangeExplorer';
import SoloGeneratorPanel from './SoloGeneratorPanel';

interface ArrangeViewProps {
  sections: TabSection[];
  transposeOffset: number;
  playState: PlaybackPosition | null;
  chordLibrary: ChordDefinition[];
  voicingPlan: SongVoicingPlan;
  theme: 'light' | 'dark';
  onInsertSolo: (afterSectionId: string, section: Omit<TabSection, 'id'>) => void;
  onOpenCreate: () => void;
}

type ArrangeTab = 'generate' | 'explore';

const ALL_KEYS: MusicalKey[] = Array.from({ length: 12 }, (_, tonic) => tonic as PitchClass)
  .flatMap(tonic => [{ tonic, mode: 'major' as const }, { tonic, mode: 'minor' as const }]);

const keyId = (key: MusicalKey) => `${key.tonic}:${key.mode}`;
const sameKey = (a: MusicalKey, b: MusicalKey) => a.tonic === b.tonic && a.mode === b.mode;
const keyName = (key: MusicalKey) => `${formatKey(key)} ${key.mode === 'major' ? '大調' : '小調'}`;

const parseSteps = (section: TabSection | undefined, transposeOffset: number): ParsedStep[] =>
  section
    ? sectionChordSteps(section, transposeOffset).map(step => ({ ...step, chord: parseChord(step.effectiveSymbol) }))
    : [];

const TABS: Array<{ id: ArrangeTab; label: string; icon: typeof Sparkles }> = [
  { id: 'generate', label: '產生 Solo', icon: Sparkles },
  { id: 'explore', label: '查音', icon: Search },
];

const ArrangeView: React.FC<ArrangeViewProps> = ({
  sections,
  transposeOffset,
  playState,
  chordLibrary,
  voicingPlan,
  onInsertSolo,
  onOpenCreate,
}) => {
  const [tab, setTab] = useState<ArrangeTab>('generate');
  const [sectionIdx, setSectionIdx] = useState(0);
  const [focusIdx, setFocusIdx] = useState(0);
  const [keyOverride, setKeyOverride] = useState<MusicalKey | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(64);

  // The header wraps to two rows on phones; sticky bars below it need its real height.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const observer = new ResizeObserver(() => setHeaderHeight(header.offsetHeight));
    observer.observe(header);
    return () => observer.disconnect();
  });

  const allChords = useMemo(
    () => sections.flatMap(section => parseSteps(section, transposeOffset).flatMap(step => step.chord ? [step.chord] : [])),
    [sections, transposeOffset]
  );
  const autoKey = useMemo(() => detectKey(allChords)[0] ?? null, [allChords]);
  const key: MusicalKey | null = keyOverride ?? autoKey;

  // Follow playback into its section and chord.
  useEffect(() => {
    if (!playState) return;
    setSectionIdx(playState.sectionIdx);
    const index = stepIndexAt(parseSteps(sections[playState.sectionIdx], transposeOffset), playState.measureIdx, playState.colIdx);
    if (index >= 0) setFocusIdx(index);
  }, [playState, sections, transposeOffset]);

  const safeSectionIdx = Math.min(sectionIdx, sections.length - 1);
  const section = sections[safeSectionIdx];
  const steps = useMemo(() => parseSteps(section, transposeOffset), [section, transposeOffset]);
  const nextSectionStep = useMemo(() => parseSteps(sections[safeSectionIdx + 1], transposeOffset)[0], [sections, safeSectionIdx, transposeOffset]);
  const capo = section?.capo ?? 0;

  if (!key || allChords.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center" data-testid="arrange-empty">
        <Music4 className="mx-auto mb-4 text-[#9a9c95]" size={32} />
        <h2 className="text-lg font-bold">這首歌還沒有和弦</h2>
        <p className="mt-2 text-sm text-[#6e716b] dark:text-zinc-400">先到「創作」頁為小節加上和弦，這裡就能幫你產生 Solo、查每個和弦能用的音。</p>
      </div>
    );
  }

  const soundingKey = { ...key, tonic: toPitchClass(key.tonic + capo) };

  return (
    <div className="pb-32" data-testid="arrange-view" style={{ '--arrange-header': `${headerHeight}px` } as React.CSSProperties}>
      <div ref={headerRef} className="sticky top-0 z-30 border-b border-[#dedcd4] bg-[#f6f6f3]/95 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-10">
          <div className="flex rounded-xl bg-[#e8e6df] p-1 dark:bg-zinc-900" role="tablist" aria-label="編曲">
            {TABS.map(item => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`flex h-9 items-center gap-1.5 rounded-lg px-4 text-xs font-bold transition-colors ${tab === item.id ? 'bg-[#fffefa] text-[#171a18] shadow-sm dark:bg-zinc-800 dark:text-zinc-100' : 'text-[#6e716b] hover:text-[#171a18] dark:text-zinc-500 dark:hover:text-zinc-100'}`}
              >
                <item.icon size={14} />{item.label}
              </button>
            ))}
          </div>

          <label className="flex h-9 items-center gap-2 rounded-xl border border-[#dedcd4] bg-[#fffefa] pl-3 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-[#85877f]">段落</span>
            <select
              value={safeSectionIdx}
              onChange={event => { setSectionIdx(Number(event.target.value)); setFocusIdx(0); }}
              className="h-full rounded-r-xl bg-transparent pr-2 font-bold outline-none"
              aria-label="段落"
            >
              {sections.map((candidate, index) => (
                <option key={candidate.id} value={index}>{candidate.title}</option>
              ))}
            </select>
          </label>

          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs" data-testid="arrange-key-bar">
            <label className="flex h-9 items-center gap-2 rounded-xl border border-[#dedcd4] bg-[#fffefa] pl-3 font-semibold dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-[#85877f]">調性</span>
              <select
                value={keyId(key)}
                onChange={event => {
                  const next = ALL_KEYS.find(candidate => keyId(candidate) === event.target.value) ?? null;
                  setKeyOverride(next && autoKey && sameKey(next, autoKey) ? null : next);
                }}
                className="h-full rounded-r-xl bg-transparent pr-2 font-bold outline-none"
                aria-label="調性"
              >
                {ALL_KEYS.map(candidate => (
                  <option key={keyId(candidate)} value={keyId(candidate)}>
                    {keyName(candidate)}{autoKey && sameKey(candidate, autoKey) ? '（自動）' : ''}
                  </option>
                ))}
              </select>
            </label>
            {capo > 0 && (
              <span className="rounded-lg px-1 text-[11px] text-[#6e716b] dark:text-zinc-400">
                Capo {capo}，實際聽起來是 {keyName(soundingKey)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6 lg:px-10">
        {steps.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#6e716b] dark:text-zinc-400">「{section?.title}」沒有和弦，換一個段落試試。</p>
        ) : tab === 'generate' ? (
          <SoloGeneratorPanel
            section={section}
            displayKey={key}
            transposeOffset={transposeOffset}
            chordLibrary={chordLibrary}
            voicingPlan={voicingPlan}
            onInsert={solo => onInsertSolo(section.id, solo)}
            onOpenCreate={onOpenCreate}
          />
        ) : (
          <ArrangeExplorer
            steps={steps}
            nextSectionStep={nextSectionStep}
            focusIdx={focusIdx}
            onFocus={setFocusIdx}
            songKey={key}
            capo={capo}
          />
        )}
      </div>
    </div>
  );
};

export default ArrangeView;
