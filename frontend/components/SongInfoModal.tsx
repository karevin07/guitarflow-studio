import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { GuitarSong, SongInfo } from '../types';
import { COMMON_KEYS, parseTagInput } from '../services/songInfo';

interface SongInfoModalProps {
  song: GuitarSong;
  /** Tags already used in the library, offered as one-tap suggestions. */
  knownTags: string[];
  onSave: (info: SongInfo & { title: string }) => Promise<boolean>;
  onClose: () => void;
}

const inputClass = 'mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-800';

/** Title, artist, original key, tags and favourite for one song. */
const SongInfoModal: React.FC<SongInfoModalProps> = ({ song, knownTags, onSave, onClose }) => {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist ?? '');
  const [originalKey, setOriginalKey] = useState(song.originalKey ?? '');
  const [tags, setTags] = useState<string[]>(song.tags ?? []);
  const [draftTag, setDraftTag] = useState('');
  const [favorite, setFavorite] = useState(Boolean(song.favorite));
  const [saving, setSaving] = useState(false);

  const addTags = (text: string) => {
    const added = parseTagInput(text).filter(tag => !tags.includes(tag));
    if (added.length > 0) setTags(prev => [...prev, ...added].slice(0, 12));
    setDraftTag('');
  };
  const suggestions = knownTags.filter(tag => !tags.includes(tag)).slice(0, 10);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const allTags = draftTag.trim() ? [...tags, ...parseTagInput(draftTag).filter(tag => !tags.includes(tag))] : tags;
    const ok = await onSave({ title: title.trim(), artist: artist.trim(), originalKey: originalKey.trim(), tags: allTags, favorite });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-label="歌曲資訊" onSubmit={submit} onClick={event => event.stopPropagation()} className="w-full max-w-lg rounded-t-[28px] bg-[#fffefa] shadow-2xl dark:bg-zinc-900 sm:rounded-3xl">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-bold">歌曲資訊</h2>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label="關閉"><X size={18} /></button>
        </header>
        <div className="space-y-4 px-5 py-5">
          <label className="block text-[11px] font-semibold text-slate-500">
            歌名
            <input value={title} onChange={event => setTitle(event.target.value)} required aria-label="歌名" className={`${inputClass} font-semibold`} />
          </label>
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <label className="block text-[11px] font-semibold text-slate-500">
              歌手
              <input value={artist} onChange={event => setArtist(event.target.value)} placeholder="選填" aria-label="歌手" className={inputClass} />
            </label>
            <label className="block text-[11px] font-semibold text-slate-500">
              原曲調
              <input value={originalKey} onChange={event => setOriginalKey(event.target.value)} list="song-info-keys" placeholder="例如 E" maxLength={12} aria-label="原曲調" className={`${inputClass} font-mono`} />
              <datalist id="song-info-keys">{COMMON_KEYS.map(key => <option key={key} value={key} />)}</datalist>
            </label>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500">標籤</div>
            <div className="mt-1 flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus-within:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-800">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 rounded-md bg-[#eceefa] py-0.5 pl-2 pr-1 text-xs font-semibold text-[#4d5bd2] dark:bg-indigo-950/50 dark:text-indigo-300">
                  {tag}
                  <button type="button" onClick={() => setTags(prev => prev.filter(item => item !== tag))} className="grid h-5 w-5 place-items-center rounded hover:bg-white/70 dark:hover:bg-zinc-700" aria-label={`移除標籤 ${tag}`}><X size={11} /></button>
                </span>
              ))}
              <input
                value={draftTag}
                onChange={event => {
                  const value = event.target.value;
                  if (/[,，、]/.test(value)) addTags(value);
                  else setDraftTag(value);
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter' && draftTag.trim()) {
                    event.preventDefault();
                    addTags(draftTag);
                  } else if (event.key === 'Backspace' && !draftTag && tags.length > 0) {
                    setTags(prev => prev.slice(0, -1));
                  }
                }}
                placeholder={tags.length === 0 ? '例如 抒情、表演，按 Enter 加入' : ''}
                aria-label="新增標籤"
                className="h-7 min-w-[8rem] flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            {suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestions.map(tag => (
                  <button key={tag} type="button" onClick={() => setTags(prev => [...prev, tag])} className="min-h-8 rounded-md border border-dashed border-slate-300 px-2 text-xs text-slate-500 hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-400">+ {tag}</button>
                ))}
              </div>
            )}
          </div>
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={favorite} onChange={event => setFavorite(event.target.checked)} className="peer sr-only" />
            <Star size={18} className={favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
            <span className="peer-focus-visible:underline">收藏</span>
          </label>
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-zinc-800">
          <button type="button" onClick={onClose} className="h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800">取消</button>
          <button type="submit" disabled={saving || !title.trim()} className="h-11 rounded-xl bg-[#4d5bd2] px-5 text-sm font-semibold text-white disabled:opacity-40">{saving ? '儲存中…' : '儲存'}</button>
        </footer>
      </form>
    </div>
  );
};

export default SongInfoModal;
