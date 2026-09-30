import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, BookOpenText, ClipboardPaste, Clock3, FileMusic, FileUp, Guitar, Import, PenLine,
  LogIn, LogOut, Play, Plus, Search, Shapes, Sparkles, Trash2,
} from 'lucide-react';
import { LibrarySong, isImportedSong } from '../types';
import { GP_ACCEPT } from '../services/gpImport';
import { AuthUser } from '../services/apiClient';
import AppRail, { AppDestination } from './AppRail';
import { commonChords, displayNameFor, greetingFor, songKeyLabel } from '../services/libraryInsights';
import { SongSession, loadSessions, sortByRecent } from '../services/sessionHistory';

const STARTER_CHORDS = ['C', 'G', 'Am', 'F', 'Em', 'D'];

interface HomeProps {
  songs: LibrarySong[];
  user: AuthUser | null;
  authLoading: boolean;
  onOpenAuth: () => void;
  onLogout: () => void;
  onCreateNew: () => void;
  onOpenChordLab: (chord?: string) => void;
  onOpen: (song: LibrarySong) => void;
  onOpenRead: (song: LibrarySong) => void;
  onOpenPractice: (song: LibrarySong) => void;
  onDelete: (song: LibrarySong) => void;
  onImportGflow: (file: File) => void;
  onImportGp: (file: File) => void;
  onPasteChordSheet: () => void;
  onClaimSong: (song: LibrarySong) => void;
  onClaimAllLegacy: () => void;
  onRailNavigate: (destination: AppDestination) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const timeAgo = (timestamp: number) => {
  const minutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60000);
  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '昨天' : `${days} 天前`;
};

const songMeta = (song: LibrarySong) => {
  if (isImportedSong(song)) {
    return { key: '—', capo: '—', chords: [] as string[], detail: song.importFormat.toUpperCase() };
  }
  const chords = Array.from(new Set(song.sections.flatMap(section => section.chords.flat()).filter((name): name is string => Boolean(name))));
  const capoValues = Array.from(new Set(song.sections.map(section => section.capo).filter(value => value > 0)));
  return {
    key: songKeyLabel(song) ?? '—',
    capo: capoValues.length === 0 ? '0' : capoValues.length === 1 ? String(capoValues[0]) : '多段',
    chords: chords.slice(0, 5),
    detail: `${song.sections.length} 個段落`,
  };
};

const Home: React.FC<HomeProps> = ({
  songs, user, authLoading, onOpenAuth, onLogout, onCreateNew, onOpenChordLab,
  onOpen, onOpenRead, onOpenPractice, onDelete, onImportGflow, onImportGp, onPasteChordSheet,
  onClaimSong, onClaimAllLegacy, onRailNavigate, theme, onToggleTheme,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'gflow' | 'imported'>('all');
  const gflowInput = useRef<HTMLInputElement>(null);
  const gpInput = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const legacyCount = songs.filter(song => song.isLegacy).length;
  // Re-read on every library change so a song opened a moment ago moves to the front.
  const sessions = useMemo(() => loadSessions(), [songs]); // eslint-disable-line react-hooks/exhaustive-deps
  const ordered = useMemo(() => sortByRecent(songs, sessions), [songs, sessions]);
  const featured = ordered.find(song => !isImportedSong(song)) ?? ordered[0];
  const recent = ordered.slice(0, 3);
  const displayName = displayNameFor(user?.username);
  const yourChords = useMemo(() => commonChords(songs), [songs]);
  const chordStrip = user && yourChords.length > 0
    ? { title: '你的歌最常用的和弦', chords: yourChords }
    : { title: '入門常用和弦', chords: STARTER_CHORDS };

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  const filteredSongs = useMemo(() => songs.filter(song => {
    if (filter === 'gflow' && isImportedSong(song)) return false;
    if (filter === 'imported' && !isImportedSong(song)) return false;
    return song.title.toLowerCase().includes(search.trim().toLowerCase());
  }), [filter, search, songs]);

  const openPicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    // While sign-in is still being checked, let the picker open; the import waits for the result.
    if (!user && !authLoading) return onOpenAuth();
    ref.current?.click();
  };

  const navigate = (destination: AppDestination) => {
    if (destination === 'library') {
      document.getElementById('song-library')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (destination === 'chords') {
      onOpenChordLab();
      return;
    }
    if (!user) {
      onOpenAuth();
      return;
    }
    onRailNavigate(destination);
  };

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[#171a18] dark:bg-[#151616] dark:text-zinc-100 lg:pl-[72px]">
      <AppRail active="library" theme={theme} onNavigate={navigate} onToggleTheme={onToggleTheme} username={user?.username} />
      <input ref={gflowInput} type="file" accept=".gflow,.json" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) onImportGflow(file); event.currentTarget.value = ''; }} />
      <input ref={gpInput} type="file" accept={GP_ACCEPT} className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) onImportGp(file); event.currentTarget.value = ''; }} />

      <header className="sticky top-0 z-30 border-b border-[#dedcd4] bg-[#fffefa]/95 px-4 py-3 backdrop-blur-xl dark:border-zinc-800 dark:bg-[#171818]/95 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#171a18] text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">GF</div>
          <div className="min-w-0 flex-1"><div className="font-semibold">GuitarFlow</div><div className="text-[11px] text-[#85877f]">你的個人曲目工作台</div></div>
          {user ? <button type="button" onClick={onLogout} className="grid h-11 w-11 place-items-center rounded-xl text-[#777a73] hover:bg-[#f0eee8]" aria-label="登出"><LogOut size={18} /></button> : <button type="button" onClick={onOpenAuth} className="h-11 rounded-xl bg-[#171a18] px-4 text-xs font-semibold text-white">登入</button>}
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-7 sm:px-7 lg:px-10 lg:pb-16 lg:pt-9 xl:px-14">
        <section className="grid gap-5 xl:grid-cols-[minmax(260px,0.75fr)_minmax(420px,1.25fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4d5bd2]">我的曲目</div>
            <h1 className="mt-2 break-words text-3xl font-bold tracking-[-0.04em] sm:text-4xl" title={user?.username}>{greetingFor(new Date())}，{displayName}</h1>
            <p className="mt-2 text-sm text-[#6e716b] dark:text-zinc-400">今天想彈哪一首？ · {songs.length} 首樂譜</p>
          </div>
          <label className="relative block min-w-0">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b8d86]" />
            <input ref={searchInput} value={search} onChange={event => setSearch(event.target.value)} placeholder="搜尋歌曲" aria-label="搜尋歌曲" aria-keyshortcuts="Control+K Meta+K" className="h-12 w-full rounded-xl border border-[#dedcd4] bg-[#fffefa] pl-11 pr-4 sm:pr-16 text-sm outline-none transition-colors placeholder:text-[#a2a49d] focus:border-[#4d5bd2] dark:border-zinc-800 dark:bg-zinc-900" />
            <span className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border sm:block border-[#dedcd4] px-2 py-1 font-mono text-[11px] text-[#85877f] dark:border-zinc-700">⌘ K</span>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => openPicker(gpInput)} className="flex h-12 items-center gap-2 rounded-xl border border-[#dedcd4] bg-[#fffefa] px-4 text-xs font-semibold text-[#5f625c] hover:border-[#b9b8b1] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"><Import size={16} />匯入樂譜</button>
            <button type="button" onClick={onPasteChordSheet} className="flex h-12 items-center gap-2 rounded-xl border border-[#dedcd4] bg-[#fffefa] px-4 text-xs font-semibold text-[#5f625c] hover:border-[#b9b8b1] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"><ClipboardPaste size={16} />貼上和弦譜</button>
            <button type="button" onClick={onCreateNew} className="flex h-12 items-center gap-2 rounded-xl bg-[#4d5bd2] px-4 text-xs font-semibold text-white hover:bg-[#3f4cc0]"><Plus size={17} />新增歌曲</button>
          </div>
        </section>

        {!authLoading && !user && (
          <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-[#dedcd4] bg-[#fffefa] p-5 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eceefa] text-[#4d5bd2] dark:bg-indigo-950/50 dark:text-indigo-300"><LogIn size={19} /></div>
            <div className="flex-1"><h2 className="text-sm font-semibold">登入以同步你的曲目</h2><p className="mt-1 text-xs text-[#6e716b] dark:text-zinc-400">儲存、匯入並在不同裝置繼續練習。</p></div>
            <button type="button" onClick={onOpenAuth} className="h-11 rounded-xl bg-[#171a18] px-5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950">登入或註冊</button>
          </section>
        )}

        {legacyCount > 0 && user && (
          <section className="mt-8 flex flex-col gap-3 rounded-2xl border border-[#dfc9aa] bg-[#fff8ed] p-5 text-[#6f4d22] sm:flex-row sm:items-center dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
            <Sparkles size={18} /><p className="flex-1 text-sm">找到 {legacyCount} 首舊版樂譜，可以認領到目前帳號。</p><button type="button" onClick={onClaimAllLegacy} className="text-xs font-semibold underline underline-offset-4">全部認領</button>
          </section>
        )}

        {featured && <FeaturedSong song={featured} session={sessions[featured.id]} onRead={onOpenRead} onPractice={onOpenPractice} onClaim={onClaimSong} />}

        {recent.length > 0 && (
          <section className="mt-12">
            <div className="mb-4 flex items-end justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#85877f]">最近</div><h2 className="mt-1 text-xl font-bold">最近打開</h2></div><button type="button" onClick={() => document.getElementById('song-library')?.scrollIntoView({ behavior: 'smooth' })} className="text-xs font-semibold text-[#4d5bd2]">查看全部</button></div>
            <div className="grid gap-3 md:grid-cols-3">{recent.map(song => <RecentSong key={song.id} song={song} session={sessions[song.id]} onOpen={onOpenRead} />)}</div>
          </section>
        )}

        <section className="mt-10 flex flex-col gap-4 rounded-2xl border border-[#dedcd4] bg-[#fffefa] px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3"><Shapes size={18} className="text-[#4d5bd2]" /><div><div className="text-sm font-semibold">{chordStrip.title}</div><div className="text-[11px] text-[#85877f]">點擊和弦，查看推薦與替代按法</div></div></div>
          <div className="flex flex-1 flex-wrap gap-1 sm:justify-center sm:gap-5">{chordStrip.chords.map(chord => <button key={chord} type="button" onClick={() => onOpenChordLab(chord)} className="min-h-11 min-w-11 rounded-lg px-2 font-mono text-sm font-semibold text-[#4d5bd2] underline-offset-4 hover:underline sm:min-h-0 sm:min-w-0 sm:px-0">{chord}</button>)}</div>
          <button type="button" onClick={() => onOpenChordLab()} className="flex items-center gap-2 text-xs font-semibold text-[#4d5bd2]">開啟和弦庫 <ArrowRight size={14} /></button>
        </section>

        <section id="song-library" className="mt-12 scroll-mt-8">
          <div className="flex flex-col gap-4 border-b border-[#dedcd4] pb-4 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
            <div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#85877f]">全部歌曲</div><h2 className="mt-1 text-xl font-bold">我的歌曲庫</h2></div>
            <div className="flex gap-1 rounded-xl bg-[#eceae4] p-1 dark:bg-zinc-900">{([['all', '全部'], ['gflow', '我的樂譜'], ['imported', '匯入']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-[11px] font-semibold ${filter === value ? 'bg-[#fffefa] text-[#171a18] shadow-sm dark:bg-zinc-800 dark:text-zinc-100' : 'text-[#777a73]'}`}>{label}</button>)}</div>
          </div>
          {filteredSongs.length > 0 ? <SongTable songs={filteredSongs} onOpen={onOpen} onRead={onOpenRead} onPractice={onOpenPractice} onDelete={onDelete} /> : <EmptyLibrary search={search} onCreate={onCreateNew} onImport={() => openPicker(gflowInput)} onPaste={onPasteChordSheet} />}
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 border-t border-[#dedcd4] bg-[#fffefa]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl dark:border-zinc-800 dark:bg-[#171818]/95 lg:hidden">
        {[{ id: 'library' as const, label: '歌曲庫', icon: FileMusic }, { id: 'create' as const, label: '創作', icon: PenLine }, { id: 'practice' as const, label: '練習', icon: Clock3 }, { id: 'arrange' as const, label: '編曲', icon: Guitar }, { id: 'chords' as const, label: '和弦庫', icon: Shapes }].map(item => <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold ${item.id === 'library' ? 'text-[#4d5bd2]' : 'text-[#85877f]'}`}><item.icon size={18} /><span>{item.label}</span></button>)}
      </nav>
    </div>
  );
};

const FeaturedSong: React.FC<{ song: LibrarySong; session?: SongSession; onRead: (song: LibrarySong) => void; onPractice: (song: LibrarySong) => void; onClaim: (song: LibrarySong) => void }> = ({ song, session, onRead, onPractice, onClaim }) => {
  const meta = songMeta(song);
  const position = session?.position;
  return <section className="mt-10"><div className="mb-4 flex items-end justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#85877f]">從上次繼續</div><h2 className="mt-1 text-xl font-bold tracking-tight">繼續彈奏</h2></div><span className="text-xs text-[#85877f]">{session ? `${timeAgo(session.openedAt)}打開` : `${timeAgo(song.lastModified)}更新`}</span></div><article className="grid overflow-hidden rounded-2xl border border-[#dedcd4] bg-[#fffefa] dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-[220px_1fr_auto]"><div className="relative min-h-48 overflow-hidden border-b border-[#dedcd4] bg-[#efede5] p-6 dark:border-zinc-800 dark:bg-zinc-950 md:border-b-0 md:border-r">{meta.chords.length > 0
  ? <div className="font-mono text-2xl font-semibold leading-[1.8] text-[#4d5bd2]">{meta.chords.slice(0, 4).join('  /  ')}</div>
  : <div className="text-sm text-[#85877f]">還沒有和弦</div>}<div className="absolute bottom-5 left-6 font-mono text-[11px] uppercase tracking-[0.18em] text-[#85877f]">{meta.detail}</div></div><div className="p-6 sm:p-8"><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-semibold uppercase tracking-[0.17em] text-[#4d5bd2]">{session ? '上次打開' : '最近更新'}</span>{song.isLegacy && <button type="button" onClick={() => onClaim(song)} className="rounded-md bg-[#fff2dc] px-2 py-1 text-[11px] font-semibold text-[#8b5e1b]">認領樂譜</button>}</div><h3 className="mt-3 text-2xl font-bold tracking-[-0.03em]">{song.title}</h3><p className="mt-2 text-xs text-[#6e716b] dark:text-zinc-400">{meta.key} 調 · Capo {meta.capo} · {meta.detail}</p><div className="mt-5 flex flex-wrap gap-3">{meta.chords.map(chord => <span key={chord} className="font-mono text-sm font-semibold text-[#4d5bd2]">{chord}</span>)}</div>{position && <><div className="mt-6 h-1.5 overflow-hidden rounded-full bg-[#e7e5de] dark:bg-zinc-800" role="progressbar" aria-valuenow={position.percent} aria-valuemin={0} aria-valuemax={100} aria-label="上次播放進度"><div className="h-full rounded-full bg-[#2b6c59]" style={{ width: `${position.percent}%` }} /></div><div className="mt-2 text-[11px] text-[#85877f]">上次播放停在 {position.sectionTitle} · {position.percent}%</div></>}</div><div className="flex items-center gap-2 border-t border-[#dedcd4] p-5 dark:border-zinc-800 md:flex-col md:justify-center md:border-l md:border-t-0"><button type="button" onClick={() => onRead(song)} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#4d5bd2] px-5 text-xs font-semibold text-white hover:bg-[#3f4cc0] md:flex-none"><BookOpenText size={16} />繼續閱讀</button><button type="button" onClick={() => onPractice(song)} className="grid h-11 w-11 place-items-center rounded-xl border border-[#dedcd4] text-[#2b6c59] hover:bg-[#e8f0eb] dark:border-zinc-700" aria-label="開始練習"><Play size={16} fill="currentColor" /></button></div></article></section>;
};

const RecentSong: React.FC<{ song: LibrarySong; session?: SongSession; onOpen: (song: LibrarySong) => void }> = ({ song, session, onOpen }) => { const meta = songMeta(song); return <button type="button" onClick={() => onOpen(song)} className="group rounded-2xl border border-[#dedcd4] bg-[#fffefa] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[#bfc2e8] dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold">{song.title}</h3><p className="mt-1 text-[11px] text-[#85877f]">{isImportedSong(song) ? song.fileName : 'GuitarFlow 樂譜'}</p></div><ArrowRight size={16} className="text-[#b0b2aa] transition-transform group-hover:translate-x-1 group-hover:text-[#4d5bd2]" /></div><div className="mt-6 font-mono text-xs font-semibold text-[#4d5bd2]">{meta.chords.slice(0, 4).join('  ') || meta.detail}</div><div className="mt-4 flex items-center justify-between border-t border-[#eceae4] pt-3 text-[11px] text-[#85877f] dark:border-zinc-800"><span>{meta.key} 調 · Capo {meta.capo}</span><span>{session ? `${timeAgo(session.openedAt)}打開` : `${timeAgo(song.lastModified)}更新`}</span></div></button>; };

const SongTable: React.FC<{ songs: LibrarySong[]; onOpen: (song: LibrarySong) => void; onRead: (song: LibrarySong) => void; onPractice: (song: LibrarySong) => void; onDelete: (song: LibrarySong) => void }> = ({ songs, onOpen, onRead, onPractice, onDelete }) => <div className="overflow-x-auto"><div className="min-w-[780px]"><div className="grid grid-cols-[minmax(230px,1.4fr)_180px_minmax(210px,1fr)_130px_128px] gap-4 border-b border-[#dedcd4] px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#979990] dark:border-zinc-800"><span>歌曲</span><span>音樂設定</span><span>主要和弦</span><span>上次彈奏</span><span className="text-right">操作</span></div>{songs.map(song => { const meta = songMeta(song); return <article key={`${song.source}-${song.id}`} className="group grid grid-cols-[minmax(230px,1.4fr)_180px_minmax(210px,1fr)_130px_128px] items-center gap-4 border-b border-[#e7e5de] px-3 py-4 transition-colors hover:bg-[#fffefa] dark:border-zinc-800 dark:hover:bg-zinc-900/70"><button type="button" onClick={() => onOpen(song)} className="min-w-0 text-left"><div className="truncate text-sm font-semibold group-hover:text-[#4d5bd2]">{song.title}</div><div className="mt-1 flex items-center gap-2 text-[11px] text-[#85877f]"><span>{isImportedSong(song) ? song.fileName : 'GuitarFlow 樂譜'}</span>{song.isLegacy && <span className="text-[#a66d22]">待認領</span>}</div></button><div className="font-mono text-[11px] text-[#5f625c] dark:text-zinc-400">{meta.key} 調 · Capo {meta.capo}<div className="mt-1 font-sans text-[#979990]">{meta.detail}</div></div><div className="flex flex-wrap gap-x-3 gap-y-1">{meta.chords.map(chord => <span key={chord} className="font-mono text-[11px] font-semibold text-[#4d5bd2]">{chord}</span>)}</div><div className="text-[11px] text-[#777a73]">{timeAgo(song.lastModified)}</div><div className="flex justify-end gap-1"><button type="button" onClick={() => onRead(song)} className="grid h-11 w-11 place-items-center rounded-lg text-[#4d5bd2] sm:h-9 sm:w-9 hover:bg-[#eceefa]" aria-label={`閱讀 ${song.title}`}><BookOpenText size={14} /></button><button type="button" onClick={() => onPractice(song)} className="grid h-11 w-11 place-items-center rounded-lg text-[#2b6c59] sm:h-9 sm:w-9 hover:bg-[#e8f0eb]" aria-label={`練習 ${song.title}`}><Play size={14} /></button><button type="button" onClick={() => onDelete(song)} className="grid h-11 w-11 place-items-center rounded-lg text-[#aaa9a2] opacity-100 sm:h-9 sm:w-9 sm:opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100" aria-label={`刪除 ${song.title}`}><Trash2 size={14} /></button></div></article>; })}</div></div>;

const EmptyLibrary: React.FC<{ search: string; onCreate: () => void; onImport: () => void; onPaste: () => void }> = ({ search, onCreate, onImport, onPaste }) => <div className="flex min-h-56 flex-col items-center justify-center border-b border-[#dedcd4] text-center dark:border-zinc-800"><FileMusic size={22} className="text-[#a3a59d]" /><h3 className="mt-3 text-sm font-semibold">{search ? '找不到符合的歌曲' : '開始建立你的曲目'}</h3><p className="mt-1 text-xs text-[#85877f]">{search ? '試試其他關鍵字。' : '新增歌曲或匯入現有樂譜。'}</p><div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={onCreate} className="h-10 rounded-xl bg-[#4d5bd2] px-4 text-xs font-semibold text-white"><Plus size={14} className="mr-1 inline" />新增歌曲</button><button type="button" onClick={onImport} className="h-10 rounded-xl border border-[#dedcd4] bg-[#fffefa] px-4 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-900"><FileUp size={14} className="mr-1 inline" />匯入 .gflow</button><button type="button" onClick={onPaste} className="h-10 rounded-xl border border-[#dedcd4] bg-[#fffefa] px-4 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-900"><ClipboardPaste size={14} className="mr-1 inline" />貼上和弦譜</button></div></div>;

export default Home;
