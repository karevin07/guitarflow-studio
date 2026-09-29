import React, { useEffect, useState } from 'react';
import { TUNING_STANDARD } from '../constants';
import { TechniqueInputHint } from '../services/tabNotation';
import {
  CellInspectorModel,
  CellNoteKind,
  buildCellFromInspector,
  cellNoteKindNeedsTarget,
  parseCellForInspector,
} from '../services/notationInput';

interface EditorSelection {
  measureIdx: number;
  stringIdx: number;
  colIdx: number;
}

interface NoteInspectorProps {
  selection: EditorSelection | null;
  cellValue: string;
  techniqueHint: TechniqueInputHint | null;
  onApply: (value: string) => void;
  onClear: () => void;
}

const KIND_OPTIONS: { value: CellNoteKind; label: string }[] = [
  { value: 'empty', label: '空' },
  { value: 'mute', label: '悶弦 (x)' },
  { value: 'fret', label: '品格' },
  { value: 'hammer', label: 'Hammer-on' },
  { value: 'pull', label: 'Pull-off' },
  { value: 'bend', label: 'Bend' },
  { value: 'slide-up', label: 'Slide ↑ (s)' },
  { value: 'slide-down', label: 'Slide ↓ (/)' },
];

const NoteInspector: React.FC<NoteInspectorProps> = ({
  selection,
  cellValue,
  techniqueHint,
  onApply,
  onClear,
}) => {
  const [model, setModel] = useState<CellInspectorModel>(() => parseCellForInspector(cellValue));

  useEffect(() => {
    setModel(parseCellForInspector(cellValue));
  }, [cellValue, selection?.measureIdx, selection?.stringIdx, selection?.colIdx]);

  if (!selection) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/30 p-6 text-center">
        <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
          點選樂譜格子以編輯音符屬性
        </p>
      </div>
    );
  }

  const needsFret = model.kind !== 'empty' && model.kind !== 'mute';
  const needsTarget = cellNoteKindNeedsTarget(model.kind);
  const preview = buildCellFromInspector(model);
  const dirty = preview !== cellValue;

  const updateKind = (kind: CellNoteKind) => {
    setModel(prev => ({
      kind,
      fret: kind === 'empty' || kind === 'mute' ? null : prev.fret,
      targetFret: cellNoteKindNeedsTarget(kind) ? prev.targetFret : null,
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
          選取的音符
        </span>
        <span className="text-[11px] font-bold text-indigo-600 dark:text-violet-400 tabular-nums">
          第 {selection.measureIdx + 1} 小節 · {TUNING_STANDARD[selection.stringIdx]} 弦 · 位置 {selection.colIdx + 1}
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/40 p-4 space-y-4">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-slate-400 dark:text-zinc-500 uppercase">目前</span>
          <code className="font-mono font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
            {cellValue === '-' ? '—' : cellValue}
          </code>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase">類型</span>
          <select
            value={model.kind}
            onChange={e => updateKind(e.target.value as CellNoteKind)}
            className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-zinc-200 outline-none focus:border-indigo-400 dark:focus:border-violet-600"
          >
            {KIND_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-white dark:bg-zinc-900">
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {needsFret && (
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase">起點品位</span>
            <input
              type="number"
              min={0}
              max={24}
              value={model.fret ?? ''}
              onChange={e => {
                const parsed = e.target.value === '' ? null : parseInt(e.target.value, 10);
                setModel(prev => ({ ...prev, fret: parsed != null && !Number.isNaN(parsed) ? parsed : null }));
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-zinc-200 outline-none focus:border-indigo-400 dark:focus:border-violet-600"
            />
          </label>
        )}

        {needsTarget && (
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase">目標品位</span>
            <input
              type="number"
              min={0}
              max={24}
              value={model.targetFret ?? ''}
              onChange={e => {
                const parsed = e.target.value === '' ? null : parseInt(e.target.value, 10);
                setModel(prev => ({
                  ...prev,
                  targetFret: parsed != null && !Number.isNaN(parsed) ? parsed : null,
                }));
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-zinc-200 outline-none focus:border-indigo-400 dark:focus:border-violet-600"
            />
          </label>
        )}

        {techniqueHint && (
          <p
            className={`text-[11px] font-semibold ${
              techniqueHint.kind === 'bend'
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-indigo-600 dark:text-violet-400'
            }`}
          >
            {techniqueHint.message}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={!dirty}
            onClick={() => onApply(preview)}
            className="flex-1 py-2 rounded-xl text-xs font-bold bg-indigo-600 dark:bg-violet-600 text-white hover:bg-indigo-700 dark:hover:bg-violet-500 disabled:opacity-40 transition-all"
          >
            套用 {dirty ? `→ ${preview}` : ''}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:border-red-300 hover:text-red-500 transition-all"
          >
            清除
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteInspector;
