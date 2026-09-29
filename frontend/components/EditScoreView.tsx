import React, { useCallback, useEffect, useRef } from 'react';
import { Plus, Anchor } from 'lucide-react';
import ScoreLine from './ScoreLine';
import ScoreRuler from './ScoreRuler';
import NotationToolbar from './NotationToolbar';
import { TabSection } from '../types';
import {
  DEFAULT_TIME_SIGNATURE,
  TIME_SIGNATURE_OPTIONS,
  formatTimeSignature,
} from '../constants/practice';
import { TechniqueInputHint, revertPendingTechnique } from '../services/tabNotation';
import { applyNotationAction, canApplyNotationAction, NotationAction } from '../services/notationInput';
import { ChordDetectionResult } from '../services/chordDetector';
import ChordCandidatePicker from './ChordCandidatePicker';

interface EditorSelection {
  sectionId: string;
  measureIdx: number;
  stringIdx: number;
  colIdx: number;
}

interface PlayState {
  sectionIdx: number;
  measureIdx: number;
  colIdx: number;
}

interface EditScoreViewProps {
  section: TabSection;
  sections: TabSection[];
  selection: EditorSelection | null;
  playState: PlayState | null;
  theme: 'light' | 'dark';
  techniqueHint: TechniqueInputHint | null;
  chordDetection: ChordDetectionResult | null;
  selectedChordName: string | null;
  onConfirmChordName: (name: string) => void;
  onUpdateTitle: (title: string) => void;
  onSetTimeSignature: (ts: [number, number]) => void;
  onSetCapo: (capo: number) => void;
  onAddMeasure: () => void;
  onSetSelection: (sel: EditorSelection) => void;
  onChordNameChange: (measureIdx: number, colIdx: number, name: string) => void;
  onLyricChange: (measureIdx: number, colIdx: number, text: string) => void;
  onDeleteMeasure: (measureIdx: number) => void;
  onCopyMeasure: (measureIdx: number) => void;
  onClearColumn: (measureIdx: number, colIdx: number) => void;
  onDropChord: (measureIdx: number, colIdx: number, chordName: string) => void;
  onCellInput: (
    sectionId: string,
    measureIdx: number,
    stringIdx: number,
    colIdx: number,
    value: string
  ) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenHelp: () => void;
}

const EditScoreView: React.FC<EditScoreViewProps> = ({
  section,
  sections,
  selection,
  playState,
  theme,
  techniqueHint,
  chordDetection,
  selectedChordName,
  onConfirmChordName,
  onUpdateTitle,
  onSetTimeSignature,
  onSetCapo,
  onAddMeasure,
  onSetSelection,
  onChordNameChange,
  onLyricChange,
  onDeleteMeasure,
  onCopyMeasure,
  onClearColumn,
  onDropChord,
  onCellInput,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenHelp,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sectionIdx = sections.findIndex(s => s.id === section.id);
  const ts = section.timeSignature ?? DEFAULT_TIME_SIGNATURE;

  const currentCellValue =
    selection != null
      ? section.measures[selection.measureIdx]?.[selection.stringIdx]?.[selection.colIdx] ?? '-'
      : '-';

  const handleNotationAction = useCallback(
    (action: NotationAction) => {
      if (!selection) return;
      const next = applyNotationAction(currentCellValue, action);
      if (next) {
        onCellInput(section.id, selection.measureIdx, selection.stringIdx, selection.colIdx, next);
      }
    },
    [selection, currentCellValue, section.id, onCellInput]
  );

  const handleCancelPending = useCallback(() => {
    if (!selection) return;
    const reverted = revertPendingTechnique(currentCellValue);
    if (reverted) {
      onCellInput(section.id, selection.measureIdx, selection.stringIdx, selection.colIdx, reverted);
    }
  }, [selection, currentCellValue, section.id, onCellInput]);

  useEffect(() => {
    if (!selection || selection.sectionId !== section.id || !scrollRef.current) return;
    const playKey = `${sectionIdx}:${selection.measureIdx}`;
    const el = scrollRef.current.querySelector<HTMLElement>(`[data-play-key="${playKey}"]`);
    if (!el) return;
    const scroller = scrollRef.current;
    const target = el.getBoundingClientRect();
    const viewport = scroller.getBoundingClientRect();
    scroller.scrollTo({
      left: scroller.scrollLeft + target.left - viewport.left - (scroller.clientWidth - target.width) / 2,
      behavior: 'smooth',
    });
  }, [selection, section.id, sectionIdx]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.shiftKey || !scrollRef.current) return;
    e.preventDefault();
    scrollRef.current.scrollLeft += e.deltaY;
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-[#f4f4f1] dark:bg-zinc-950 transition-colors duration-250">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 p-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 sm:p-6 sm:pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-6 flex-wrap">
            <input
              value={section.title}
              onChange={e => onUpdateTitle(e.target.value)}
              className="min-w-0 max-w-full flex-1 bg-transparent text-xl font-bold tracking-tight text-slate-900 outline-none border-b-2 border-transparent focus:border-indigo-500 dark:text-zinc-100 dark:focus:border-violet-500 sm:text-2xl"
            />
            <div className="hidden h-8 w-px bg-slate-200 dark:bg-zinc-800 sm:block" />
            <div className="flex items-center gap-2 bg-white/70 dark:bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
              <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                拍號
              </span>
              <select
                value={formatTimeSignature(ts)}
                onChange={e => {
                  const [num, den] = e.target.value.split('/').map(v => parseInt(v, 10));
                  if (num > 0 && den > 0) onSetTimeSignature([num, den]);
                }}
                className="bg-transparent text-sm font-bold text-slate-600 dark:text-zinc-300 outline-none cursor-pointer"
              >
                {TIME_SIGNATURE_OPTIONS.map(([num, den]) => (
                  <option key={`${num}/${den}`} value={`${num}/${den}`} className="bg-white dark:bg-zinc-900">
                    {num}/{den}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-white/70 dark:bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
              <Anchor size={14} className="text-slate-400 dark:text-zinc-500" />
              <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500">
                Capo
              </span>
              <select
                value={section.capo}
                onChange={e => onSetCapo(parseInt(e.target.value, 10))}
                className="bg-transparent text-sm font-bold text-slate-600 dark:text-zinc-300 outline-none cursor-pointer"
              >
                {Array.from({ length: 13 }).map((_, i) => (
                  <option key={i} value={i} className="bg-white dark:bg-zinc-900">
                    {i === 0 ? '不夾' : i}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={onAddMeasure}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-violet-900/40 text-indigo-600 dark:text-violet-400 border border-indigo-200/50 dark:border-violet-900/30 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Plus size={16} /> 新增小節
          </button>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-3 font-medium">
          橫向連續樂譜 · Shift + 滾輪可左右捲動 · 上方工具列可輸入技巧
        </p>
      </div>

      <NotationToolbar
        hasSelection={selection != null}
        techniqueHint={techniqueHint}
        canApply={action => canApplyNotationAction(currentCellValue, action)}
        onAction={handleNotationAction}
        onCancelPending={handleCancelPending}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        onOpenHelp={onOpenHelp}
      />

      {chordDetection && (
        <ChordCandidatePicker result={chordDetection} currentName={selectedChordName} onConfirm={onConfirmChordName} />
      )}

      <div className="flex-1 overflow-y-auto p-3 pb-4 min-h-0 sm:p-6 sm:pb-4">
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          className="overflow-x-auto overflow-y-hidden rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/30 shadow-inner"
        >
          <div className="flex items-stretch min-w-min">
            {section.measures.map((measure, mIdx) => {
              const isSecPlaying = playState != null && sections[playState.sectionIdx]?.id === section.id;
              const isMeasPlaying = isSecPlaying && playState?.measureIdx === mIdx;
              const playKey = `${sectionIdx}:${mIdx}`;
              const isSelectedMeasure = selection?.measureIdx === mIdx;

              return (
                <div
                  key={mIdx}
                  className={`flex-shrink-0 border-r border-slate-200 dark:border-zinc-800 last:border-r-0 transition-colors ${
                    isSelectedMeasure ? 'bg-indigo-50/30 dark:bg-violet-950/20' : ''
                  }`}
                >
                  <ScoreRuler
                    measureNumber={mIdx + 1}
                    showTimeSignature={mIdx === 0}
                    timeSignature={ts}
                  />
                  <ScoreLine
                    mode="edit"
                    variant="flow"
                    measureIndex={mIdx}
                    playKey={playKey}
                    measure={measure}
                    chords={section.chords[mIdx]}
                    lyrics={section.lyrics[mIdx]}
                    activeCol={isSelectedMeasure ? selection!.colIdx : null}
                    activeString={isSelectedMeasure ? selection!.stringIdx : null}
                    playCol={isMeasPlaying ? playState!.colIdx : null}
                    theme={theme}
                    onCellClick={(sIdx, cIdx) =>
                      onSetSelection({
                        sectionId: section.id,
                        measureIdx: mIdx,
                        stringIdx: sIdx,
                        colIdx: cIdx,
                      })
                    }
                    onChordClick={cIdx =>
                      onSetSelection({
                        sectionId: section.id,
                        measureIdx: mIdx,
                        stringIdx: 0,
                        colIdx: cIdx,
                      })
                    }
                    onChordNameChange={(cIdx, name) => onChordNameChange(mIdx, cIdx, name)}
                    onLyricChange={(cIdx, text) => onLyricChange(mIdx, cIdx, text)}
                    onDelete={() => onDeleteMeasure(mIdx)}
                    onCopy={() => onCopyMeasure(mIdx)}
                    onClearColumn={cIdx => onClearColumn(mIdx, cIdx)}
                    onDropChord={(cIdx, chordName) => onDropChord(mIdx, cIdx, chordName)}
                    canDelete={section.measures.length > 1}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditScoreView;
