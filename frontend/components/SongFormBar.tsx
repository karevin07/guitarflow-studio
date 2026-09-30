import React, { useState } from 'react';
import { ArrowDown, ArrowUp, ListOrdered, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { TabSection } from '../types';
import { MAX_REPEAT, SongFormEntry, formSteps } from '../services/songForm';
import { moveItem } from '../services/songInfo';

interface SongFormBarProps {
  sections: TabSection[];
  form: SongFormEntry[];
  /** Step of the play order being played, if any. */
  currentStep: number | null;
  onChange?: (form: SongFormEntry[]) => void;
  /** Jump playback to the first play of an entry (index into the expanded play order). */
  onJump?: (step: number) => void;
}

/** The song's play order as chips (前奏 → 主歌 → 副歌 ×2), with an inline editor. */
const SongFormBar: React.FC<SongFormBarProps> = ({ sections, form, currentStep, onChange, onJump }) => {
  const [editing, setEditing] = useState(false);
  const custom = formSteps(form, sections).length > 0;
  const entries = custom
    ? formSteps(form, sections)
    : sections.map((_, sectionIdx) => ({ sectionIdx, repeat: 1 }));
  // First step of each entry in the expanded order.
  const firstSteps = entries.reduce<number[]>((starts, entry, index) => [...starts, index === 0 ? 0 : starts[index - 1] + entries[index - 1].repeat], []);
  const activeEntry = currentStep === null ? -1 : firstSteps.findIndex((start, index) => currentStep >= start && currentStep < start + entries[index].repeat);

  // Edits work on ids so they survive sections being moved; a first edit starts from the written order.
  const editable: SongFormEntry[] = custom
    ? form.filter(entry => sections.some(section => section.id === entry.sectionId))
    : sections.map(section => ({ sectionId: section.id, repeat: 1 }));
  const update = (next: SongFormEntry[]) => onChange?.(next);

  if (sections.length === 0) return null;

  return (
    <section className="mb-8 print:hidden" aria-label="演奏順序">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400"><ListOrdered size={15} className="text-indigo-500 dark:text-violet-400" />演奏順序</h2>
        <ol className="flex flex-wrap items-center gap-1" data-testid="song-form">
          {entries.map((entry, index) => {
            const active = index === activeEntry;
            const label = `${sections[entry.sectionIdx].title}${entry.repeat > 1 ? ` ×${entry.repeat}` : ''}`;
            return (
              <li key={index} className="flex items-center gap-1">
                {index > 0 && <span className="text-slate-300 dark:text-zinc-600" aria-hidden="true">→</span>}
                <button
                  type="button"
                  onClick={() => onJump?.(firstSteps[index])}
                  disabled={!onJump}
                  aria-current={active ? 'step' : undefined}
                  className={`min-h-9 rounded-lg px-2.5 text-xs font-semibold transition-colors ${active ? 'bg-[#2b6c59] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'}`}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ol>
        {onChange && (
          <button type="button" onClick={() => setEditing(open => !open)} aria-expanded={editing} className="ml-auto min-h-9 rounded-lg px-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-violet-400 dark:hover:bg-violet-950/40">
            {editing ? '完成' : '編輯順序'}
          </button>
        )}
      </div>

      {editing && onChange && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900" data-testid="song-form-editor">
          <ol className="space-y-1">
            {editable.map((entry, index) => {
              const section = sections.find(item => item.id === entry.sectionId)!;
              const setRepeat = (repeat: number) => update(editable.map((item, itemIndex) => (itemIndex === index ? { ...item, repeat } : item)));
              return (
                <li key={index} className="flex items-center gap-1.5 rounded-lg px-1 py-1 hover:bg-slate-50 dark:hover:bg-zinc-800/60">
                  <span className="w-5 text-right font-mono text-[11px] text-slate-400">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{section.title}</span>
                  <div className="flex items-center rounded-lg border border-slate-200 dark:border-zinc-700">
                    <button type="button" onClick={() => setRepeat(entry.repeat - 1)} disabled={entry.repeat <= 1} className="grid h-9 w-9 place-items-center text-slate-500 disabled:opacity-30" aria-label={`${section.title} 少彈一次`}><Minus size={13} /></button>
                    <span className="w-8 text-center font-mono text-xs font-semibold" aria-label={`${section.title} 彈 ${entry.repeat} 次`}>×{entry.repeat}</span>
                    <button type="button" onClick={() => setRepeat(entry.repeat + 1)} disabled={entry.repeat >= MAX_REPEAT} className="grid h-9 w-9 place-items-center text-slate-500 disabled:opacity-30" aria-label={`${section.title} 多彈一次`}><Plus size={13} /></button>
                  </div>
                  <button type="button" onClick={() => update(moveItem(editable, index, -1))} disabled={index === 0} className="grid h-9 w-9 place-items-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-zinc-700" aria-label={`第 ${index + 1} 個 ${section.title} 往前`}><ArrowUp size={14} /></button>
                  <button type="button" onClick={() => update(moveItem(editable, index, 1))} disabled={index === editable.length - 1} className="grid h-9 w-9 place-items-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-zinc-700" aria-label={`第 ${index + 1} 個 ${section.title} 往後`}><ArrowDown size={14} /></button>
                  <button type="button" onClick={() => update(editable.filter((_, itemIndex) => itemIndex !== index))} disabled={editable.length <= 1} className="grid h-9 w-9 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 dark:hover:bg-red-950/40" aria-label={`移除第 ${index + 1} 個 ${section.title}`}><X size={14} /></button>
                </li>
              );
            })}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-zinc-800">
            <span className="mr-1 text-[11px] font-semibold text-slate-500">再彈一次：</span>
            {sections.map(section => (
              <button key={section.id} type="button" onClick={() => update([...editable, { sectionId: section.id, repeat: 1 }])} className="min-h-9 rounded-md border border-dashed border-slate-300 px-2 text-xs text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-300" aria-label={`加入 ${section.title}`}>+ {section.title}</button>
            ))}
            {custom && (
              <button type="button" onClick={() => update([])} className="ml-auto flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"><RotateCcw size={12} />照段落順序</button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">段落只要寫一次；副歌要彈兩次就設 ×2，不同結尾可以各寫一段再排進來。播放會照這個順序。</p>
        </div>
      )}
    </section>
  );
};

export default SongFormBar;
