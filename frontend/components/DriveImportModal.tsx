import React, { useState } from 'react';
import { Check, CloudDownload, Loader2, X } from 'lucide-react';
import { DriveGflowFile } from '../services/googleDrive';

interface DriveImportModalProps {
  /** null while the list is loading. */
  files: DriveGflowFile[] | null;
  /** Drive keys of the songs already in the library. */
  libraryKeys: Set<string>;
  importing: boolean;
  onImport: (files: DriveGflowFile[]) => void;
  onClose: () => void;
}

const formatTime = (time: number) =>
  new Date(time).toLocaleString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Pick .gflow files uploaded from GuitarFlow to import back into the library. */
const DriveImportModal: React.FC<DriveImportModalProps> = ({ files, libraryKeys, importing, onImport, onClose }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const inLibrary = (file: DriveGflowFile) => !!file.songKey && libraryKeys.has(file.songKey);
  // "Select all" skips songs already in the library, so restoring a backup does not add copies.
  const missing = (files ?? []).filter(file => !inLibrary(file));
  const allSelected = missing.length > 0 && missing.every(file => selected.has(file.id));
  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={importing ? undefined : onClose}>
      <div role="dialog" aria-modal="true" aria-label="從 Google Drive 匯入" onClick={event => event.stopPropagation()} className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-[#fffefa] shadow-2xl dark:bg-zinc-900 sm:rounded-3xl">
        <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
          <CloudDownload size={18} className="shrink-0 text-[#4d5bd2]" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold">從 Google Drive 匯入</h2>
            <p className="text-[11px] text-slate-400">從 GuitarFlow 上傳過的樂譜</p>
          </div>
          <button type="button" onClick={onClose} disabled={importing} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-zinc-800" aria-label="關閉"><X size={18} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {files === null ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" />讀取 Google Drive…</div>
          ) : files.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-slate-400">Drive 上還沒有 GuitarFlow 樂譜。<br />在歌曲頁選「匯出 → 上傳到 Google Drive」後，就會出現在這裡。</p>
          ) : (
            <ul className="space-y-1">
              {files.map(file => {
                const checked = selected.has(file.id);
                return (
                  <li key={file.id}>
                    <button type="button" role="checkbox" aria-checked={checked} onClick={() => toggle(file.id)} disabled={importing} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left ${checked ? 'bg-[#eceefa] dark:bg-indigo-950/40' : 'hover:bg-slate-100 dark:hover:bg-zinc-800'}`}>
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${checked ? 'border-[#4d5bd2] bg-[#4d5bd2] text-white' : 'border-slate-300 dark:border-zinc-600'}`}>{checked && <Check size={13} />}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{file.name.replace(/\.gflow$/i, '')}</span>
                      {inLibrary(file) && <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">已在曲庫</span>}
                      <span className="shrink-0 font-mono text-[11px] text-slate-400">{formatTime(file.modifiedTime)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-slate-200 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-zinc-800">
          {missing.length > 1 && (
            <button type="button" onClick={() => setSelected(allSelected ? new Set() : new Set(missing.map(file => file.id)))} disabled={importing} className="h-11 rounded-xl px-3 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800">{allSelected ? '全部取消' : missing.length < (files?.length ?? 0) ? '選取未在曲庫的' : '全選'}</button>
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} disabled={importing} className="h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800">取消</button>
            <button type="button" onClick={() => onImport((files ?? []).filter(file => selected.has(file.id)))} disabled={importing || selected.size === 0} className="h-11 rounded-xl bg-[#4d5bd2] px-5 text-sm font-semibold text-white disabled:opacity-40">{importing ? '匯入中…' : selected.size > 0 ? `匯入 ${selected.size} 首` : '匯入'}</button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DriveImportModal;
