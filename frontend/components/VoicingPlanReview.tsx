import React, { useEffect, useMemo, useState } from 'react';
import { Check, LockKeyhole, Route, Sparkles, X } from 'lucide-react';
import { getVoicingPosition } from '../guitar';
import { planSongVoicings, VoicingPlanStrategy } from '../services/voicingPlanner';
import { ChordDefinition, SongVoicingPlan, TabSection } from '../types';
import ChordDiagram from './ChordDiagram';

interface VoicingPlanReviewProps {
  sections: TabSection[];
  chordLibrary: ChordDefinition[];
  existingPlan: SongVoicingPlan;
  transposeOffset?: number;
  theme?: 'light' | 'dark';
  onApply: (plan: SongVoicingPlan) => void;
  onClose: () => void;
}

const strategies: Array<{
  value: VoicingPlanStrategy;
  label: string;
  description: string;
}> = [
  { value: 'balanced', label: '平衡', description: '兼顧音色與和弦切換距離' },
  { value: 'easy', label: '最容易', description: '優先開放和弦與較小跨度' },
  { value: 'low', label: '低把位', description: '盡量維持在琴頸前段' },
];

const positionLabels = {
  low: '低把位',
  middle: '中把位',
  high: '高把位',
};

const fretLabel = (frets: Array<number | null>) =>
  [...frets].reverse().map(fret => fret === null ? 'X' : fret).join(' ');

const VoicingPlanReview: React.FC<VoicingPlanReviewProps> = ({
  sections,
  chordLibrary,
  existingPlan,
  transposeOffset = 0,
  theme = 'dark',
  onApply,
  onClose,
}) => {
  const [strategy, setStrategy] = useState<VoicingPlanStrategy>('balanced');
  const result = useMemo(() => planSongVoicings({
    sections,
    chordLibrary,
    existingPlan,
    transposeOffset,
    strategy,
  }), [chordLibrary, existingPlan, sections, strategy, transposeOffset]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const applyPlan = () => {
    onApply(result.plan);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voicing-plan-title"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[28px] border border-slate-200 bg-[#f7f7f4] shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:rounded-[28px]">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 dark:border-zinc-800 sm:px-7">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-violet-400">
              <Sparkles size={14} /> Phase 2 · Smart voicing
            </div>
            <h2 id="voicing-plan-title" className="text-xl font-bold tracking-tight text-slate-950 dark:text-zinc-50 sm:text-2xl">整首歌指法配置</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">依照和弦進行安排順手的把位，套用前仍可完整預覽。</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-slate-950 dark:hover:bg-zinc-900 dark:hover:text-white" aria-label="關閉指法配置">
            <X size={19} />
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="配置策略">
            {strategies.map(item => {
              const active = strategy === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setStrategy(item.value)}
                  className={`rounded-2xl border p-4 text-left transition-all ${active ? 'border-indigo-500 bg-white shadow-sm ring-2 ring-indigo-500/10 dark:border-violet-500 dark:bg-zinc-900' : 'border-slate-200 bg-white/45 hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-zinc-100">{item.label}</span>
                    {active && <Check size={15} className="text-indigo-600 dark:text-violet-400" strokeWidth={3} />}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-zinc-400">{item.description}</p>
                </button>
              );
            })}
          </div>

          {result.suggestions.length > 0 ? (
            <>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                  <Route size={16} className="shrink-0 text-indigo-500 dark:text-violet-400" />
                  <div className="flex gap-1.5 overflow-x-auto py-1">
                    {result.progression.slice(0, 18).map((step, index) => (
                      <React.Fragment key={`${step.sourceSymbol}-${index}`}>
                        {index > 0 && <span className="self-center text-slate-300 dark:text-zinc-700">→</span>}
                        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">{step.effectiveSymbol}</span>
                      </React.Fragment>
                    ))}
                    {result.progression.length > 18 && <span className="self-center text-xs text-slate-400">+{result.progression.length - 18}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">預估切換成本</div>
                  <div className="font-mono text-sm font-bold text-slate-800 dark:text-zinc-100">{result.transitionCost.toFixed(1)}</div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {result.suggestions.map(suggestion => {
                  const chord: ChordDefinition = {
                    name: suggestion.effectiveSymbol,
                    frets: suggestion.shape.frets,
                    fingers: suggestion.shape.fingers,
                    barres: suggestion.shape.barres,
                  };
                  return (
                    <article key={suggestion.sourceSymbol} className="flex min-h-[176px] overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex w-[124px] shrink-0 items-center justify-center border-r border-slate-100 p-1 dark:border-zinc-800">
                        <ChordDiagram chord={chord} size={112} theme={theme} variant="bare" />
                      </div>
                      <div className="min-w-0 flex-1 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-mono text-lg font-bold text-slate-950 dark:text-zinc-50">{suggestion.effectiveSymbol}</div>
                            {suggestion.effectiveSymbol !== suggestion.sourceSymbol && <div className="text-[11px] text-slate-400">原譜 {suggestion.sourceSymbol}</div>}
                          </div>
                          {suggestion.locked && <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><LockKeyhole size={10} /> 已固定</span>}
                        </div>
                        <div className="mt-4 font-mono text-xs font-semibold tracking-wide text-slate-600 dark:text-zinc-300">{fretLabel(suggestion.shape.frets)}</div>
                        <div className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          {positionLabels[getVoicingPosition(suggestion.shape.frets)]} · 出現 {suggestion.occurrences} 次
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-zinc-700">
              <div className="text-sm font-semibold text-slate-700 dark:text-zinc-200">目前沒有可配置的和弦</div>
              <p className="mt-1 text-xs text-slate-400">請先在歌曲中加入和弦，或確認和弦名稱是否受支援。</p>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-slate-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900 sm:px-7">
          <p className="hidden text-xs text-slate-400 sm:block">套用後仍可逐一調整或重設每個和弦。</p>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800">取消</button>
            <button type="button" onClick={applyPlan} disabled={result.suggestions.length === 0} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-violet-600 dark:hover:bg-violet-500">
              <Sparkles size={14} /> 套用整首歌
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default VoicingPlanReview;
