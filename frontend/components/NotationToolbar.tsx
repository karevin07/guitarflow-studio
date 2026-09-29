import React from 'react';
import { HelpCircle, Redo2, Undo2, X } from 'lucide-react';
import { TechniqueInputHint } from '../services/tabNotation';
import { NotationAction } from '../services/notationInput';

interface ToolbarButton {
  action: NotationAction;
  label: string;
  title: string;
  disabled?: boolean;
  active?: boolean;
}

interface NotationToolbarProps {
  hasSelection: boolean;
  techniqueHint: TechniqueInputHint | null;
  canApply: (action: NotationAction) => boolean;
  onAction: (action: NotationAction) => void;
  onCancelPending: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenHelp: () => void;
}

const TECHNIQUE_BUTTONS: Omit<ToolbarButton, 'disabled' | 'active'>[] = [
  { action: 'mute', label: 'x', title: '悶弦 (x)' },
  { action: 'hammer', label: 'h', title: 'Hammer-on — 先輸入品絲再按 h' },
  { action: 'pull', label: 'p', title: 'Pull-off — 先輸入品絲再按 p' },
  { action: 'bend', label: 'b', title: 'Bend — 先輸入品絲再按 b' },
  { action: 'slide-up', label: 's', title: 'Slide up (s)' },
  { action: 'slide-down', label: '/', title: 'Slide down (/)' },
];

const NotationToolbar: React.FC<NotationToolbarProps> = ({
  hasSelection,
  techniqueHint,
  canApply,
  onAction,
  onCancelPending,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenHelp,
}) => {
  const pendingKind = techniqueHint?.kind ?? null;

  const buttons: ToolbarButton[] = TECHNIQUE_BUTTONS.map(btn => ({
    ...btn,
    disabled: !hasSelection || !canApply(btn.action),
    active:
      pendingKind != null &&
      ((btn.action === 'hammer' && pendingKind === 'hammer') ||
        (btn.action === 'pull' && pendingKind === 'pull') ||
        (btn.action === 'bend' && pendingKind === 'bend')),
  }));

  return (
    <div className="flex items-center gap-3 flex-wrap px-6 py-3 border-b border-slate-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-md">
      <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mr-1">
        技巧
      </span>

      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/80">
        {buttons.map(btn => (
          <button
            key={btn.action}
            type="button"
            title={btn.title}
            disabled={btn.disabled}
            onClick={() => onAction(btn.action)}
            className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-extrabold font-mono transition-all ${
              btn.active
                ? 'bg-indigo-600 dark:bg-violet-600 text-white shadow-md shadow-indigo-500/25 dark:shadow-violet-500/25 ring-2 ring-indigo-400/50 dark:ring-violet-400/50'
                : btn.disabled
                  ? 'text-slate-300 dark:text-zinc-700 cursor-not-allowed'
                  : 'text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 hover:text-indigo-600 dark:hover:text-violet-400'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {techniqueHint && (
        <button
          type="button"
          onClick={onCancelPending}
          title="取消未完成的技巧輸入 (Esc)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/40 hover:bg-orange-100 dark:hover:bg-orange-950/60 transition-all"
        >
          <X size={12} />
          取消
        </button>
      )}

      <div className="flex-1 min-w-[1rem]" />

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="復原 (Ctrl/Cmd + Z)"
          aria-label="復原"
          className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:border-indigo-300 dark:hover:border-violet-700 hover:text-indigo-600 dark:hover:text-violet-400 disabled:opacity-30 transition-all sm:hidden"
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title="重做 (Ctrl/Cmd + Y)"
          aria-label="重做"
          className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:border-indigo-300 dark:hover:border-violet-700 hover:text-indigo-600 dark:hover:text-violet-400 disabled:opacity-30 transition-all sm:hidden"
        >
          <Redo2 size={16} />
        </button>
        <button
          type="button"
          onClick={onOpenHelp}
          title="快捷鍵說明 (?)"
          aria-label="快捷鍵說明"
          className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:border-indigo-300 dark:hover:border-violet-700 hover:text-indigo-600 dark:hover:text-violet-400 transition-all"
        >
          <HelpCircle size={16} />
        </button>
      </div>
    </div>
  );
};

export default NotationToolbar;
