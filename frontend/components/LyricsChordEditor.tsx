import React, { useLayoutEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { TabSection } from '../types';
import { parseChord } from '../music-theory';
import { TIME_SIGNATURE_OPTIONS, formatTimeSignature } from '../constants/practice';
import { chordSlots, lyricSlots } from '../services/lyricsEditor';

interface LyricsChordEditorProps {
  section: TabSection;
  /** Chords already used in the song, most useful first. */
  songChords: string[];
  /** Bar currently playing in this section, if any. */
  playingMeasure: number | null;
  onSetChord: (measureIdx: number, col: number, name: string | null) => void;
  onSetLyric: (measureIdx: number, col: number, text: string) => void;
  onAddMeasure: () => void;
  onDeleteMeasure: (measureIdx: number) => void;
  onUpdateTitle: (title: string) => void;
  onSetCapo: (capo: number) => void;
  onSetTimeSignature: (timeSignature: [number, number]) => void;
}

const COMMON_CHORDS = ['C', 'G', 'Am', 'F', 'D', 'Em', 'E', 'A', 'Dm', 'G7'];

type TextBox = HTMLInputElement | HTMLTextAreaElement;

/** Move focus to the next text box of the same kind, like a spreadsheet's Enter. */
const focusNext = (current: TextBox) => {
  const kind = current.dataset.kind;
  const boxes = [...document.querySelectorAll<TextBox>(`[data-kind="${kind}"]`)];
  boxes[boxes.indexOf(current) + 1]?.focus();
};

const fitHeight = (box: HTMLTextAreaElement) => {
  box.style.height = 'auto';
  box.style.height = `${box.scrollHeight}px`;
};

/** A one-line-looking lyric box that wraps and grows instead of cutting long lines off. */
const LyricBox: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = props => {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    if (ref.current) fitHeight(ref.current);
  });
  return <textarea ref={ref} rows={1} onInput={event => fitHeight(event.currentTarget)} {...props} />;
};

const LyricsChordEditor: React.FC<LyricsChordEditorProps> = ({
  section,
  songChords,
  playingMeasure,
  onSetChord,
  onSetLyric,
  onAddMeasure,
  onDeleteMeasure,
  onUpdateTitle,
  onSetCapo,
  onSetTimeSignature,
}) => {
  const [focusedChord, setFocusedChord] = useState<{ measureIdx: number; col: number } | null>(null);
  const palette = [...new Set([...songChords, ...COMMON_CHORDS])].slice(0, 14);
  const timeSignature = section.timeSignature ?? [4, 4];

  const commitChord = (input: HTMLInputElement, measureIdx: number, col: number) => {
    const value = input.value.trim();
    if (value !== (section.chords[measureIdx]?.[col] ?? '')) onSetChord(measureIdx, col, value || null);
  };
  const commitLyric = (input: HTMLTextAreaElement, measureIdx: number, col: number) => {
    if (input.value !== (section.lyrics[measureIdx]?.[col] ?? '')) onSetLyric(measureIdx, col, input.value);
  };
  const handleKeys = (event: React.KeyboardEvent<TextBox>, original: string) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const input = event.currentTarget;
      input.blur();
      focusNext(input);
    } else if (event.key === 'Escape') {
      event.currentTarget.value = original;
      event.currentTarget.blur();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f6f6f3] pb-40 dark:bg-zinc-950" data-testid="lyrics-editor">
      <div className="mx-auto max-w-[1100px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center gap-3">
          <input
            key={section.id + section.title}
            defaultValue={section.title}
            onBlur={event => event.currentTarget.value.trim() && event.currentTarget.value !== section.title && onUpdateTitle(event.currentTarget.value.trim())}
            onKeyDown={event => event.key === 'Enter' && event.currentTarget.blur()}
            className="min-w-0 flex-1 rounded-lg bg-transparent px-1 text-2xl font-bold tracking-tight outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200 dark:focus:bg-zinc-900 dark:focus:ring-violet-900"
            aria-label="段落名稱"
          />
          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-slate-400">拍號</span>
            <select value={formatTimeSignature(timeSignature)} onChange={event => { const option = TIME_SIGNATURE_OPTIONS.find(ts => formatTimeSignature(ts) === event.target.value); if (option) onSetTimeSignature(option); }} className="bg-transparent font-bold outline-none" aria-label="拍號">
              {TIME_SIGNATURE_OPTIONS.map(ts => <option key={formatTimeSignature(ts)} value={formatTimeSignature(ts)}>{formatTimeSignature(ts)}</option>)}
            </select>
          </label>
          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-slate-400">Capo</span>
            <select value={section.capo} onChange={event => onSetCapo(Number(event.target.value))} className="bg-transparent font-bold outline-none" aria-label="Capo">
              {Array.from({ length: 13 }, (_, fret) => <option key={fret} value={fret}>{fret === 0 ? '不夾' : fret}</option>)}
            </select>
          </label>
        </header>

        <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95" aria-label="常用和弦">
          <span className="mr-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
            {focusedChord ? `填入第 ${focusedChord.measureIdx + 1} 小節：` : '點和弦格後，按這裡快速填入：'}
          </span>
          {palette.map(name => (
            <button
              key={name}
              type="button"
              disabled={!focusedChord}
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                if (!focusedChord) return;
                onSetChord(focusedChord.measureIdx, focusedChord.col, name);
                const inputs = [...document.querySelectorAll<HTMLInputElement>('input[data-kind="chord"]')];
                const current = inputs.find(input => input === document.activeElement);
                if (current) { current.value = name; focusNext(current); }
              }}
              className="min-h-10 min-w-10 rounded-md px-2 py-1 font-mono text-xs font-bold text-indigo-600 sm:min-h-0 sm:min-w-0 hover:bg-indigo-50 disabled:text-slate-300 dark:text-violet-400 dark:hover:bg-violet-950/40 dark:disabled:text-zinc-600"
            >
              {name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 dark:border-zinc-800 dark:bg-zinc-800 md:grid-cols-4">
          {section.measures.map((_, measureIdx) => {
            const chords = section.chords[measureIdx] ?? [];
            const lyrics = section.lyrics[measureIdx] ?? [];
            const playing = playingMeasure === measureIdx;
            return (
              <div key={measureIdx} className={`group relative px-2.5 pb-2 pt-4 ${playing ? 'bg-[#edf4ef] dark:bg-emerald-950/25' : 'bg-white dark:bg-zinc-900'}`} data-testid="lyrics-measure">
                <span className="absolute left-1.5 top-1 font-mono text-[9px] text-slate-300 dark:text-zinc-600">{measureIdx + 1}</span>
                <button
                  type="button"
                  onClick={() => onDeleteMeasure(measureIdx)}
                  disabled={section.measures.length <= 1}
                  className="absolute right-0.5 top-0.5 grid h-8 w-8 place-items-center rounded-md text-slate-300 opacity-100 hover:bg-red-50 hover:text-red-500 focus:opacity-100 sm:h-6 sm:w-6 sm:opacity-0 sm:group-hover:opacity-100 disabled:hidden dark:hover:bg-red-950/40"
                  aria-label={`刪除第 ${measureIdx + 1} 小節`}
                >
                  <Trash2 size={12} />
                </button>
                <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-y-1">
                  {chordSlots(chords).map(({ col, span }) => {
                    const value = chords[col] ?? '';
                    const invalid = Boolean(value) && !parseChord(value);
                    return (
                      <input
                        key={`c${col}:${value}`}
                        data-kind="chord"
                        defaultValue={value}
                        placeholder="·"
                        onFocus={() => setFocusedChord({ measureIdx, col })}
                        onBlur={event => { commitChord(event.currentTarget, measureIdx, col); setFocusedChord(current => current?.measureIdx === measureIdx && current.col === col ? null : current); }}
                        onKeyDown={event => handleKeys(event, value)}
                        style={{ gridColumn: `${col + 1} / span ${span}` }}
                        className={`h-10 min-w-0 rounded-md bg-transparent px-1 font-mono text-sm font-bold sm:h-7 outline-none placeholder:text-slate-200 hover:bg-slate-50 focus:bg-indigo-50 focus:ring-1 focus:ring-indigo-300 dark:placeholder:text-zinc-700 dark:hover:bg-zinc-800 dark:focus:bg-violet-950/40 ${invalid ? 'text-red-600 underline decoration-wavy dark:text-red-400' : 'text-indigo-600 dark:text-violet-400'}`}
                        aria-label={`第 ${measureIdx + 1} 小節第 ${col / 4 + 1} 拍和弦`}
                        aria-invalid={invalid || undefined}
                        title={invalid ? '看不懂這個和弦名稱' : undefined}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    );
                  })}
                  {lyricSlots(chords, lyrics).map(({ col, span }, index) => {
                    const value = lyrics[col] ?? '';
                    return (
                      <LyricBox
                        key={`l${col}:${value}`}
                        data-kind="lyric"
                        defaultValue={value}
                        placeholder={index === 0 ? '歌詞' : ''}
                        onBlur={event => commitLyric(event.currentTarget, measureIdx, col)}
                        onKeyDown={event => handleKeys(event, value)}
                        style={{ gridColumn: `${col + 1} / span ${span}` }}
                        className="min-h-8 min-w-0 resize-none overflow-hidden rounded-md bg-transparent px-1 py-1 text-[15px] font-medium leading-snug text-slate-800 outline-none placeholder:text-slate-300 hover:bg-slate-50 focus:bg-indigo-50 focus:ring-1 focus:ring-indigo-300 dark:text-zinc-100 dark:placeholder:text-zinc-700 dark:hover:bg-zinc-800 dark:focus:bg-violet-950/40"
                        aria-label={`第 ${measureIdx + 1} 小節歌詞`}
                        autoComplete="off"
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
          {Array.from({ length: (4 - (section.measures.length % 4)) % 4 }, (_, index) => (
            <div key={`filler-${index}`} className="bg-white dark:bg-zinc-900" aria-hidden="true" />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={onAddMeasure} className="flex h-11 items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 text-xs font-semibold text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-300">
            <Plus size={15} />新增小節
          </button>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">Enter 跳到下一格 · Esc 取消 · 和弦寫在拍子上，歌詞會延伸到下一個和弦</p>
        </div>
      </div>
    </div>
  );
};

export default LyricsChordEditor;
