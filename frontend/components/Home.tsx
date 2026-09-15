
import React, { useState, useRef } from 'react';
import { Music, Plus, Search, Clock, FileText, Trash2, Upload, Sun, Moon, LogIn, LogOut, User, ShieldCheck } from 'lucide-react';
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

const sourceBadge = (song: LibrarySong): { label: string; className: string } => {
  if (isImportedSong(song)) {
    const isXml = song.importFormat === 'xml' || song.importFormat === 'musicxml';
    return {
      label: isXml ? 'MusicXML' : 'Guitar Pro',
      className: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/40',
    };
  }
  return {
    label: 'GFlow',
    className: 'bg-indigo-100 dark:bg-violet-950/40 text-indigo-700 dark:text-violet-400 border-indigo-200/60 dark:border-violet-900/40',
  };
};

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
  const [searchTerm, setSearchTerm] = useState('');
  const gflowInputRef = useRef<HTMLInputElement>(null);
  const gpInputRef = useRef<HTMLInputElement>(null);

  const filteredSongs = songs.filter(s =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const legacyCount = songs.filter(s => s.isLegacy).length;

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  return (
    <div className="min-h-screen bg-[#f6f6f3] dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 flex flex-col selection:bg-indigo-500/20 dark:selection:bg-violet-500/30 selection:text-indigo-900 dark:selection:text-violet-200 transition-colors duration-250">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-xl transition-colors duration-250 dark:border-zinc-800 dark:bg-zinc-950/90 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-indigo-600 p-2.5 text-white shadow-sm dark:bg-violet-600">
              <Music size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">GuitarFlow</h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-500">Practice workspace</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative order-last w-full lg:order-none lg:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" size={18} />
              <input
                placeholder="Search songs..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2.5 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/30"
              />
            </div>

            <button
              onClick={onToggleTheme}
              className="p-3 text-slate-500 dark:text-zinc-500 hover:text-slate-855 dark:hover:text-zinc-200 bg-slate-100 dark:bg-zinc-900/85 border border-slate-200 dark:border-zinc-800 hover:bg-slate-200/50 dark:hover:bg-zinc-800 rounded-2xl transition-all shadow-sm flex items-center justify-center"
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {user ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-zinc-900/85 border border-slate-200 dark:border-zinc-800 rounded-2xl">
                <User size={16} className="text-indigo-600 dark:text-violet-400" />
                <span className="text-sm font-bold text-slate-700 dark:text-zinc-200">{user.username}</span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors"
                  title="登出"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                disabled={authLoading}
                className="flex items-center gap-2 px-4 py-3 bg-indigo-50 dark:bg-violet-950/40 border border-indigo-200 dark:border-violet-900/40 text-indigo-700 dark:text-violet-300 rounded-2xl font-bold text-sm hover:bg-indigo-100 dark:hover:bg-violet-950/60 transition-all"
              >
                <LogIn size={18} /> {authLoading ? '載入中…' : '登入'}
              </button>
            )}

            <button
              onClick={() => (user ? gflowInputRef.current?.click() : onOpenAuth())}
              className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-zinc-900/85 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 rounded-2xl font-bold shadow-sm hover:border-indigo-500 dark:hover:border-violet-500 hover:text-indigo-600 dark:hover:text-violet-400 transition-all whitespace-nowrap text-sm"
            >
              <Upload size={18} /> .gflow
            </button>
            <input
              ref={gflowInputRef}
              type="file"
              accept=".gflow,.json,application/json"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) onImportGflow(file);
                e.target.value = '';
              }}
            />

            <button
              onClick={() => (user ? gpInputRef.current?.click() : onOpenAuth())}
              className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-zinc-900/85 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 rounded-2xl font-bold shadow-sm hover:border-amber-500 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-all whitespace-nowrap text-sm"
            >
              <Upload size={18} /> Guitar Pro
            </button>
            <input
              ref={gpInputRef}
              type="file"
              accept={GP_ACCEPT}
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) onImportGp(file);
                e.target.value = '';
              }}
            />

            <button
              onClick={user ? onCreateNew : onOpenAuth}
              className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 active:scale-95 dark:bg-violet-600 dark:hover:bg-violet-500"
            >
              <Plus size={20} /> Create New
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-12">
        {user && legacyCount > 0 && (
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl">
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                有 {legacyCount} 首未認領的舊版樂譜
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">
                這些樂譜在帳號系統上線前建立，認領後將歸屬於你的帳號。
              </p>
            </div>
            <button
              type="button"
              onClick={onClaimAllLegacy}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition-colors shrink-0"
            >
              <ShieldCheck size={18} /> 全部認領
            </button>
          </div>
        )}

        {!user && !authLoading ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[32px] flex items-center justify-center text-slate-400 dark:text-zinc-600 shadow-inner">
              <LogIn size={48} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-zinc-100 mb-2">請先登入</h2>
              <p className="text-slate-400 dark:text-zinc-500 max-w-sm mx-auto text-sm">
                登入後即可建立、匯入與管理你的樂譜。每位使用者只能看到自己的歌曲。
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white rounded-2xl font-bold shadow-lg hover:opacity-95 transition-all"
            >
              <LogIn size={20} /> 登入 / 註冊
            </button>
          </div>
        ) : filteredSongs.length > 0 ? (
          <>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Your collection</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">Recently edited</h2>
            </div>
            <span className="text-xs font-medium text-slate-400 dark:text-zinc-500">{filteredSongs.length} scores</span>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredSongs.map(song => {
              const badge = sourceBadge(song);
              return (
                <div
                  key={song.id}
                  onClick={() => onOpen(song)}
                  className="group grid cursor-pointer grid-cols-[64px_minmax(0,1fr)] gap-x-4 rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/40 dark:border-zinc-800 dark:bg-zinc-900/55 dark:hover:border-violet-800 dark:hover:shadow-black/20"
                >
                  <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-slate-200/60 bg-slate-50 transition-colors group-hover:bg-indigo-50 dark:border-zinc-800 dark:bg-zinc-950/80 dark:group-hover:bg-violet-950/30">
                    <FileText size={26} className="text-slate-300 transition-colors group-hover:text-indigo-500 dark:text-zinc-700 dark:group-hover:text-violet-400" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 dark:bg-black/20">
                      <div className="translate-y-2 rounded-full bg-indigo-600 p-2 text-white shadow-lg transition-all duration-300 group-hover:translate-y-0 dark:bg-violet-600">
                        <Music size={16} />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="mb-1 truncate text-base font-bold text-slate-800 transition-colors group-hover:text-indigo-600 dark:text-zinc-100 group-hover:dark:text-violet-400">{song.title}</h3>
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                      <Clock size={14} />
                      {formatDate(song.lastModified)}
                    </div>
                  </div>

                  <div className="col-span-2 mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-zinc-800/50">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase ${badge.className}`}>
                        {badge.label}
                      </span>
                      {song.isLegacy && (
                        <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-200/60 dark:border-amber-900/40 uppercase">
                          Legacy
                        </span>
                      )}
                      {!isImportedSong(song) && (
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 px-2.5 py-1 rounded-full border border-slate-200 dark:border-zinc-800 uppercase">
                          {song.sections?.length || 0} Sections
                        </span>
                      )}
                      {isImportedSong(song) && (
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 px-2.5 py-1 rounded-full border border-slate-200 dark:border-zinc-800 uppercase">
                          {song.importFormat}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {song.isLegacy && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onClaimSong(song);
                          }}
                          className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl transition-all"
                          title="認領此樂譜"
                        >
                          <ShieldCheck size={18} />
                        </button>
                      )}
                      <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const msg = isImportedSong(song)
                          ? 'Remove this imported score from this browser?'
                          : 'Delete this song forever?';
                        if (confirm(msg)) onDelete(song);
                      }}
                      className="p-2 text-slate-400 dark:text-zinc-650 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                      title="Delete Song"
                    >
                      <Trash2 size={18} />
                    </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        ) : (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[32px] flex items-center justify-center text-slate-400 dark:text-zinc-600 shadow-inner">
              <Music size={48} className="text-slate-400 dark:text-zinc-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-zinc-100 mb-2">
                {searchTerm ? 'No matches found' : 'Your library is empty'}
              </h2>
              <p className="text-slate-400 dark:text-zinc-500 max-w-xs mx-auto text-sm">
                {searchTerm ? `We couldn't find any songs matching "${searchTerm}"` : 'Create a new score or import .gflow / Guitar Pro files to get started.'}
              </p>
            </div>
            {!searchTerm && user && (
              <button
                onClick={onCreateNew}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 dark:from-violet-600 dark:via-fuchsia-600 dark:to-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/15 dark:shadow-violet-500/25 hover:opacity-95 transition-all hover:scale-[1.02]"
              >
                <Plus size={20} /> New Score
              </button>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 py-8 text-center dark:border-zinc-900">
        <p className="text-xs font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-widest">
          GuitarFlow Studio &bull; Crafting the future of guitar notation
        </p>
      </footer>
    </div>
  );
};

export default Home;
