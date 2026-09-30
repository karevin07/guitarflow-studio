import React, { useMemo, useState } from 'react';
import { ClipboardPaste, X } from 'lucide-react';
import { GuitarSong } from '../types';
import { chordSheetToSong, parseChordSheet } from '../services/chordSheetImport';
import LeadSheetMeasure from './LeadSheetMeasure';

interface ChordSheetImportModalProps {
  onClose: () => void;
  onCreate: (song: Omit<GuitarSong, 'id' | 'lastModified'>) => Promise<void>;
}

const EXAMPLE = `我的歌
拍速：80
Capo: 2

[前奏] |C  |G  |Am  |F  |

|C          |G          |
 第一句歌詞  寫在和弦下面
|Am         |F    G     |
 用 | 分小節  一小節可以有兩個和弦

副歌：
|F          |G          |C     Am    |
 空一行或寫段落名稱  就會開新段落`;

/** Paste a chord sheet (chords over lyrics or ChordPro), check the preview, create the song. */
const ChordSheetImportModal: React.FC<ChordSheetImportModalProps> = ({ onClose, onCreate }) => {
  const [text, setText] = useState('');
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const result = useMemo(() => parseChordSheet(text), [text]);
  const title = titleOverride ?? result.title;
  const barCount = result.sections.reduce((total, section) => total + section.bars.length, 0);

  const create = async () => {
    setCreating(true);
    try {
      await onCreate(chordSheetToSong(result, title));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="貼上和弦譜" className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[28px] bg-[#fffefa] shadow-2xl dark:bg-zinc-900 sm:rounded-3xl" onClick={event => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-zinc-800 sm:px-6">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold"><ClipboardPaste size={18} className="text-[#4d5bd2]" />貼上和弦譜</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">從網站複製「和弦在上、歌詞在下」的譜，或 ChordPro 格式。右邊會即時預覽，建立後可以在創作頁修正。</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label="關閉"><X size={18} /></button>
        </header>

        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-2 lg:overflow-hidden">
          <div className="flex min-h-[18rem] flex-col border-b border-slate-200 p-4 dark:border-zinc-800 lg:border-b-0 lg:border-r sm:p-5">
            <textarea
              value={text}
              onChange={event => setText(event.target.value)}
              placeholder="在這裡貼上和弦譜…"
              aria-label="和弦譜文字"
              spellCheck={false}
              className="min-h-[16rem] flex-1 resize-none rounded-xl border border-slate-200 bg-white p-3 font-mono text-[13px] leading-6 outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
              <span>和弦行與歌詞行要用等寬字型對齊；沒有 | 時，每個和弦當一小節。</span>
              {!text && <button type="button" onClick={() => setText(EXAMPLE)} className="font-semibold text-[#4d5bd2] hover:underline">填入範例</button>}
            </div>
          </div>

          <div className="flex min-h-0 flex-col p-4 sm:p-5" data-testid="sheet-preview">
            <label className="text-[11px] font-semibold text-slate-500">
              歌名
              <input
                value={title}
                onChange={event => setTitleOverride(event.target.value)}
                placeholder="未命名歌曲"
                aria-label="歌名"
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
              <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-zinc-800">{result.format === 'chordpro' ? 'ChordPro' : '和弦 + 歌詞'}</span>
              <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-zinc-800">{result.sections.length} 段 · {barCount} 小節</span>
              {result.bpm && <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-zinc-800">{result.bpm} BPM</span>}
              {result.capo > 0 && <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-zinc-800">Capo {result.capo}</span>}
            </div>
            {result.unknownChords.length > 0 && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                看不懂的和弦（會照原樣保留）：<span className="font-mono">{result.unknownChords.join('、')}</span>
              </p>
            )}

            <div className="mt-3 min-h-[12rem] flex-1 space-y-4 overflow-y-auto pr-1 lg:min-h-0">
              {result.sections.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">貼上後，這裡會顯示辨識出的段落和小節。</p>
              ) : result.sections.map((section, sectionIndex) => (
                <section key={`${section.title}-${sectionIndex}`}>
                  <h3 className="mb-1.5 text-sm font-bold">{section.title}</h3>
                  <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-zinc-800 dark:bg-zinc-800 md:grid-cols-4">
                    {section.bars.map((bar, barIndex) => (
                      <LeadSheetMeasure
                        key={barIndex}
                        measureNumber={barIndex + 1}
                        chords={bar.chords}
                        displayChords={bar.chords}
                        lyrics={bar.lyrics}
                        selectedChord={null}
                        fontScale={0.85}
                        onSelectChord={() => undefined}
                      />
                    ))}
                    {Array.from({ length: (4 - (section.bars.length % 4)) % 4 }, (_, index) => (
                      <div key={`filler-${index}`} className="hidden bg-white dark:bg-zinc-900 md:block" aria-hidden="true" />
                    ))}
                    {section.bars.length % 2 === 1 && <div className="bg-white dark:bg-zinc-900 md:hidden" aria-hidden="true" />}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-zinc-800 sm:px-6">
          <button type="button" onClick={onClose} className="h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800">取消</button>
          <button type="button" onClick={create} disabled={barCount === 0 || creating} className="h-11 rounded-xl bg-[#4d5bd2] px-5 text-sm font-semibold text-white disabled:opacity-40">
            {creating ? '建立中…' : '建立歌曲'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ChordSheetImportModal;
