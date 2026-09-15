import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Clock3,
  FileMusic,
  FileText,
  FolderOpen,
  Guitar,
  Import,
  LogIn,
  LogOut,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { LibrarySong, isImportedSong } from '../types';
import { GP_ACCEPT } from '../services/gpImport';
import { AuthUser } from '../services/apiClient';

interface HomeProps {
  songs: LibrarySong[];
  user: AuthUser | null;
  authLoading: boolean;
  onOpenAuth: () => void;
  onLogout: () => void;
  onCreateNew: () => void;
  onOpen: (song: LibrarySong) => void;
  onDelete: (song: LibrarySong) => void;
  onImportGflow: (file: File) => void;
  onImportGp: (file: File) => void;
  onClaimSong: (song: LibrarySong) => void;
  onClaimAllLegacy: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const Home: React.FC<HomeProps> = ({
  songs,
  user,
  authLoading,
  onOpenAuth,
  onLogout,
  onCreateNew,
  onOpen,
  onDelete,
  onImportGflow,
  onImportGp,
  onClaimSong,
  onClaimAllLegacy,
  theme,
  onToggleTheme,
}) => {
  const [search, setSearch] = useState('');
  const gflowInput = useRef<HTMLInputElement>(null);
  const gpInput = useRef<HTMLInputElement>(null);
  const filteredSongs = songs.filter(song => song.title.toLowerCase().includes(search.toLowerCase()));
  const legacyCount = songs.filter(song => song.isLegacy).length;

  const openPicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (!user) return onOpenAuth();
    ref.current?.click();
  };

  return (
    <div className="min-h-screen bg-[#f4f4f1] text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 lg:flex">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-white dark:bg-zinc-100 dark:text-zinc-950"><Guitar size={20} /></div>
          <div><div className="font-bold tracking-tight">GuitarFlow</div><div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">Studio</div></div>
        </div>

        <nav className="mt-10 space-y-1">
          <button type="button" className="flex w-full items-center gap-3 rounded-xl bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700 dark:bg-violet-950/50 dark:text-violet-300"><FolderOpen size={17} /> Library</button>
          <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"><Clock3 size={17} /> Recently played</button>
          <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"><BookOpen size={17} /> Chord lab</button>
        </nav>

        <div className="mt-8 border-t border-slate-200 pt-6 dark:border-zinc-800">
          <div className="px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Import</div>
          <button type="button" onClick={() => openPicker(gflowInput)} className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"><Upload size={17} /> GuitarFlow file</button>
          <button type="button" onClick={() => openPicker(gpInput)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"><FileMusic size={17} /> Guitar Pro / XML</button>
        </div>

        <div className="mt-auto space-y-2">
          <button type="button" onClick={onToggleTheme} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-900">{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />} {theme === 'dark' ? 'Light appearance' : 'Dark appearance'}</button>
          {user && <div className="flex items-center gap-3 rounded-2xl bg-slate-100 p-3 dark:bg-zinc-900"><div className="grid h-8 w-8 place-items-center rounded-full bg-white text-slate-500 dark:bg-zinc-800 dark:text-zinc-300"><User size={15} /></div><span className="min-w-0 flex-1 truncate text-xs font-semibold">{user.username}</span><button type="button" onClick={onLogout} className="text-slate-400 hover:text-red-500" aria-label="Sign out"><LogOut size={16} /></button></div>}
        </div>
      </aside>

      <main className="min-h-screen lg:ml-64">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/80 sm:px-6 lg:hidden">
          <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white dark:bg-zinc-100 dark:text-zinc-950"><Guitar size={18} /></div><span className="font-bold">GuitarFlow</span></div>
          <div className="flex items-center gap-2"><button type="button" onClick={onToggleTheme} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>{user ? <button type="button" onClick={onLogout} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-zinc-900 dark:text-zinc-400"><LogOut size={16} /></button> : <button type="button" onClick={onOpenAuth} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950">Sign in</button>}</div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7 lg:px-10 lg:py-12">
          <section className="relative overflow-hidden rounded-[32px] bg-slate-950 px-6 py-9 text-white shadow-2xl shadow-slate-300/40 dark:bg-zinc-900 dark:shadow-black/30 sm:px-10 sm:py-11">
            <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="absolute -bottom-32 right-48 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
            <div className="relative max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300"><Sparkles size={13} className="text-violet-300" /> Adaptive guitar workspace</div>
              <h1 className="text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-5xl">Turn an idea into something you can play.</h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Write tabs, import scores, transpose instantly, and practice with fingerings that adapt to the song.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button type="button" onClick={user ? onCreateNew : onOpenAuth} className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5"><Plus size={17} /> New score</button>
                <button type="button" onClick={() => openPicker(gpInput)} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"><Import size={17} /> Import music</button>
              </div>
            </div>
          </section>

          <input ref={gflowInput} type="file" accept=".gflow,.json,application/json" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) onImportGflow(file); event.target.value = ''; }} />
          <input ref={gpInput} type="file" accept={GP_ACCEPT} className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) onImportGp(file); event.target.value = ''; }} />

          {user && legacyCount > 0 && (
            <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30 sm:flex-row sm:items-center">
              <div><div className="text-sm font-semibold text-amber-900 dark:text-amber-200">{legacyCount} legacy scores are ready to claim</div><div className="mt-1 text-xs text-amber-700 dark:text-amber-400">Move scores created before accounts into your library.</div></div>
              <button type="button" onClick={onClaimAllLegacy} className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white"><ShieldCheck size={15} /> Claim all</button>
            </div>
          )}

          <section className="mt-12">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div><div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Your collection</div><h2 className="mt-1 text-2xl font-bold tracking-tight">Pick up where you left off</h2></div>
              <label className="relative block w-full sm:w-72"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search your scores" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-violet-700" /></label>
            </div>

            {!user && !authLoading ? (
              <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/30"><LogIn size={24} className="text-slate-400" /><h3 className="mt-4 font-semibold">Sign in to open your library</h3><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-zinc-400">Your tabs, imported scores, and practice history stay connected to your account.</p><button type="button" onClick={onOpenAuth} className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white dark:bg-violet-600">Sign in or create account</button></div>
            ) : filteredSongs.length > 0 ? (
              <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/45">
                {filteredSongs.map((song, index) => {
                  const imported = isImportedSong(song);
                  return (
                    <article key={song.id} onClick={() => onOpen(song)} className={`group flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-900 sm:p-5 ${index > 0 ? 'border-t border-slate-100 dark:border-zinc-800' : ''}`}>
                      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${imported ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-indigo-50 text-indigo-600 dark:bg-violet-950/50 dark:text-violet-400'}`}>{imported ? <FileMusic size={20} /> : <FileText size={20} />}</div>
                      <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-zinc-100 dark:group-hover:text-violet-400 sm:text-base">{song.title}</h3><div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-500"><span>{imported ? song.importFormat : 'GFlow'}</span><span>·</span><span>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(song.lastModified))}</span>{!imported && <><span>·</span><span>{song.sections.length} sections</span></>}{song.isLegacy && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">Legacy</span>}</div></div>
                      {song.isLegacy && <button type="button" onClick={event => { event.stopPropagation(); onClaimSong(song); }} className="hidden rounded-xl p-2 text-amber-500 hover:bg-amber-50 sm:block" title="Claim score"><ShieldCheck size={17} /></button>}
                      <button type="button" onClick={event => { event.stopPropagation(); if (confirm(`Delete “${song.title}”?`)) onDelete(song); }} className="rounded-xl p-2 text-slate-300 opacity-100 hover:bg-red-50 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 dark:text-zinc-700 dark:hover:bg-red-950/30" title="Delete"><Trash2 size={17} /></button>
                      <ArrowRight size={17} className="hidden text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-indigo-500 sm:block dark:text-zinc-700" />
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 p-8 text-center dark:border-zinc-800"><MoreHorizontal size={24} className="text-slate-400" /><h3 className="mt-3 font-semibold">{search ? 'No matching scores' : 'Your library is ready'}</h3><p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{search ? 'Try another title.' : 'Create or import your first piece.'}</p></div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Home;
