import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Search, Trash2, X } from 'lucide-react';
import { GuitarSong, Setlist } from '../types';
import { matchesSearch, moveItem, setlistSongs } from '../services/songInfo';

interface SetlistModalProps {
  /** null creates a new setlist. */
  setlist: Setlist | null;
  songs: GuitarSong[];
  onSave: (changes: Pick<Setlist, 'name' | 'songIds'>) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onClose: () => void;
}

/** Name a setlist and put songs in play order. */
const SetlistModal: React.FC<SetlistModalProps> = ({ setlist, songs, onSave, onDelete, onClose }) => {
  const [name, setName] = useState(setlist?.name ?? '');
  const [songIds, setSongIds] = useState<string[]>(() => (setlist ? setlistSongs(setlist, songs).map(song => song.id) : []));
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const byId = useMemo(() => new Map(songs.map(song => [song.id, song])), [songs]);
  const candidates = useMemo(
    () => songs.filter(song => !songIds.includes(song.id) && matchesSearch(song, query)).slice(0, 30),
    [query, songIds, songs]
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const ok = await onSave({ name: name.trim(), songIds });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-label={setlist ? '編輯歌單' : '新增歌單'} onSubmit={submit} onClick={event => event.stopPropagation()} className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] bg-[#fffefa] shadow-2xl dark:bg-zinc-900 sm:rounded-3xl">
        <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
          <input value={name} onChange={event => setName(event.target.value)} placeholder="歌單名稱，例如 週六表演" aria-label="歌單名稱" required autoFocus={!setlist} className="h-11 min-w-0 flex-1 rounded-lg bg-transparent px-1 text-lg font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200 dark:focus:bg-zinc-800 dark:focus:ring-violet-900" />
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label="關閉"><X size={18} /></button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-2 md:overflow-hidden">
          <section className="flex min-h-0 flex-col border-b border-slate-200 p-4 dark:border-zinc-800 md:border-b-0 md:border-r" aria-label="演奏順序">
            <h3 className="text-[11px] font-semibold text-slate-500">演奏順序 · {songIds.length} 首</h3>
            {songIds.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">從右邊加入歌曲。</p>
            ) : (
              <ol className="mt-2 space-y-1 md:min-h-0 md:overflow-y-auto">
                {songIds.map((id, index) => {
                  const song = byId.get(id);
                  if (!song) return null;
                  return (
                    <li key={id} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 dark:bg-zinc-800" data-testid="setlist-item">
                      <span className="w-5 text-right font-mono text-xs text-slate-400">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{song.title}</div>
                        {song.artist && <div className="truncate text-[11px] text-slate-400">{song.artist}</div>}
                      </div>
                      <button type="button" onClick={() => setSongIds(prev => moveItem(prev, index, -1))} disabled={index === 0} className="grid h-9 w-9 place-items-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-zinc-700" aria-label={`上移 ${song.title}`}><ArrowUp size={14} /></button>
                      <button type="button" onClick={() => setSongIds(prev => moveItem(prev, index, 1))} disabled={index === songIds.length - 1} className="grid h-9 w-9 place-items-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-zinc-700" aria-label={`下移 ${song.title}`}><ArrowDown size={14} /></button>
                      <button type="button" onClick={() => setSongIds(prev => prev.filter(item => item !== id))} className="grid h-9 w-9 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40" aria-label={`移除 ${song.title}`}><X size={14} /></button>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="flex min-h-0 flex-col p-4" aria-label="加入歌曲">
            <label className="relative block">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜尋歌名、歌手或標籤" aria-label="搜尋要加入的歌曲" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-800" />
            </label>
            <ul className="mt-2 space-y-1 md:min-h-0 md:overflow-y-auto">
              {candidates.map(song => (
                <li key={song.id}>
                  <button type="button" onClick={() => setSongIds(prev => [...prev, song.id])} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label={`加入 ${song.title}`}>
                    <Plus size={14} className="shrink-0 text-[#4d5bd2]" />
                    <span className="min-w-0 flex-1 truncate text-sm">{song.title}</span>
                    {song.artist && <span className="truncate text-[11px] text-slate-400">{song.artist}</span>}
                  </button>
                </li>
              ))}
              {candidates.length === 0 && <li className="py-6 text-center text-xs text-slate-400">沒有其他符合的歌曲</li>}
            </ul>
          </section>
        </div>

        <footer className="flex items-center gap-2 border-t border-slate-200 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-zinc-800">
          {setlist && (confirmDelete ? (
            <span className="flex items-center gap-2 text-xs">
              確定刪除？
              <button type="button" onClick={async () => { if (await onDelete()) onClose(); }} className="h-9 rounded-lg bg-red-600 px-3 font-semibold text-white">刪除</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="h-9 rounded-lg px-2 text-slate-500">不要</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"><Trash2 size={14} />刪除歌單</button>
          ))}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800">取消</button>
            <button type="submit" disabled={saving || !name.trim()} className="h-11 rounded-xl bg-[#4d5bd2] px-5 text-sm font-semibold text-white disabled:opacity-40">{saving ? '儲存中…' : '儲存'}</button>
          </div>
        </footer>
      </form>
    </div>
  );
};

export default SetlistModal;
