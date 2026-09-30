import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Music2 } from 'lucide-react';
import { PATTERN_PRESETS, parsePattern } from '../services/accompaniment';

interface PatternPickerProps {
  sectionTitle: string;
  value: string;
  onChange: (pattern: string) => void;
  onApplyToAll: (pattern: string) => void;
}

/** Choose a section's accompaniment: a preset, a custom notation, or none. */
const PatternPicker: React.FC<PatternPickerProps> = ({ sectionTitle, value, onChange, onApplyToAll }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const current = value.trim();
  const preset = PATTERN_PRESETS.find(item => item.text === current);
  const parsed = draft.trim() ? parsePattern(draft) : null;

  useEffect(() => setDraft(value), [value, open]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const choose = (pattern: string) => {
    onChange(pattern);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative normal-case tracking-normal print:hidden">
      <button
        type="button"
        onClick={() => setOpen(wasOpen => !wasOpen)}
        aria-expanded={open}
        aria-label={`${sectionTitle} 伴奏：${current || '無'}`}
        className={`flex h-11 max-w-56 items-center gap-1.5 rounded-xl px-3 sm:h-9 ${current ? 'border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300' : 'border border-slate-200 text-slate-600 hover:border-indigo-300 dark:border-zinc-700 dark:text-zinc-300'}`}
      >
        <Music2 size={13} className="shrink-0" />
        <span className="truncate font-mono">{current ? preset?.name ?? current : '伴奏'}</span>
        <ChevronDown size={12} className="shrink-0" />
      </button>

      {open && (
        <div role="dialog" aria-label={`${sectionTitle} 伴奏`} className="fixed inset-x-3 bottom-24 z-[80] max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-12 sm:z-50 sm:max-h-none sm:w-80">
          <div className="mb-2 text-xs font-bold text-slate-700 dark:text-zinc-200">「{sectionTitle}」的伴奏</div>
          <div className="space-y-1">
            <button type="button" onClick={() => choose('')} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-zinc-800">
              <span><span className="font-semibold">不用伴奏</span><span className="ml-2 text-slate-400">只在換和弦時刷一下</span></span>
              {!current && <Check size={14} className="text-[#2b6c59]" />}
            </button>
            {PATTERN_PRESETS.map(item => (
              <button key={item.id} type="button" onClick={() => choose(item.text)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-zinc-800">
                <span className="min-w-0">
                  <span className="flex items-baseline gap-2"><span className="font-semibold">{item.name}</span><span className="font-mono text-indigo-600 dark:text-violet-400">{item.text}</span></span>
                  <span className="block text-[11px] text-slate-400">{item.hint}</span>
                </span>
                {current === item.text && <Check size={14} className="shrink-0 text-[#2b6c59]" />}
              </button>
            ))}
          </div>

          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-zinc-800">
            <label className="text-[11px] font-semibold text-slate-500">
              自訂（照譜上的寫法，空格分開每一拍）
              <input
                value={draft}
                onChange={event => setDraft(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter' && parsed?.ok) choose(draft.trim()); }}
                placeholder="例如 ↓ ↓↑ -↑ ↓↑ 或 T1 21 31 21"
                aria-label="自訂伴奏"
                aria-invalid={parsed?.ok === false || undefined}
                className={`mt-1 h-10 w-full rounded-lg border bg-white px-2.5 font-mono text-sm outline-none dark:bg-zinc-800 ${parsed?.ok === false ? 'border-red-300 dark:border-red-800' : 'border-slate-200 focus:border-indigo-400 dark:border-zinc-700'}`}
              />
            </label>
            <div className="mt-1 min-h-4 text-[11px] text-slate-400">
              {parsed?.ok === false ? <span className="text-red-600 dark:text-red-400">{parsed.error}</span> : '↓ 下刷  ↑ 上刷  X 切音  - 休息  T 低音  1 2 3 第三、二、一弦'}
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={!parsed?.ok} onClick={() => choose(draft.trim())} className="h-9 flex-1 rounded-lg bg-slate-900 text-xs font-semibold text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-950">套用到這段</button>
              <button type="button" disabled={!parsed?.ok} onClick={() => { onApplyToAll(draft.trim()); setOpen(false); }} className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40 dark:border-zinc-700">套用到全曲</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatternPicker;
