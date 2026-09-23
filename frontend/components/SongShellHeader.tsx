import React from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  Edit3,
  Eye,
  FileMusic,
  FileText,
  Music2,
  MoreHorizontal,
  Redo2,
  Save,
  Shapes,
  Undo2,
  User,
} from 'lucide-react';
import { ImportedSong } from '../types';
import { AuthUser } from '../services/apiClient';
import AppRail, { AppDestination } from './AppRail';

type ShellViewMode = 'create' | 'practice';

interface SongShellHeaderProps {
  isImported: boolean;
  viewMode: ShellViewMode;
  onViewModeChange: (mode: ShellViewMode) => void;
  onOpenChordLibrary: () => void;
  onBack: () => void;
  title: string;
  onTitleChange: (title: string) => void;
  onTitleBlur?: () => void;
  importedSong?: ImportedSong | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenShortcuts: () => void;
  autosaveEnabled: boolean;
  onToggleAutosave: () => void;
  saveStatus: 'idle' | 'saving' | 'saved';
  onSave: () => void;
  isExportOpen: boolean;
  onToggleExport: () => void;
  onExportGflow: () => void;
  onExportMidi: () => void;
  onExportPdf: () => void;
  onExportMusicXml: () => void;
  onConvertToGflow?: () => void;
  convertToGflowDisabled?: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  user?: AuthUser | null;
  onLogout?: () => void;
}

interface ExportMenuProps {
  open: boolean;
  onToggle: () => void;
  onGflow: () => void;
  onMidi: () => void;
  onPdf: () => void;
  onMusicXml: () => void;
  compact?: boolean;
}

const ExportMenu: React.FC<ExportMenuProps> = ({
  open,
  onToggle,
  onGflow,
  onMidi,
  onPdf,
  onMusicXml,
  compact = false,
}) => (
  <div className="relative">
    <button
      type="button"
      onClick={onToggle}
      className="flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white transition-colors hover:bg-indigo-600 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-violet-400"
      aria-expanded={open}
    >
      <Download size={16} />
      {!compact && <span>Export</span>}
      <ChevronDown size={13} />
    </button>
    {open && (
      <div className="absolute right-0 top-12 z-[80] w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {[
          { label: 'GuitarFlow project', detail: '.gflow', icon: FileText, action: onGflow },
          { label: 'MIDI performance', detail: '.mid', icon: Music2, action: onMidi },
          { label: 'Printable score', detail: '.pdf', icon: Eye, action: onPdf },
          { label: 'MusicXML', detail: '.xml', icon: FileMusic, action: onMusicXml },
        ].map(item => (
          <button key={item.label} type="button" onClick={item.action} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800">
            <item.icon size={16} className="text-slate-400 dark:text-zinc-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">{item.label}</span>
            <span className="ml-auto font-mono text-[9px] text-slate-400 dark:text-zinc-500">{item.detail}</span>
          </button>
        ))}
      </div>
    )}
  </div>
);

const SongShellHeader: React.FC<SongShellHeaderProps> = ({
  isImported,
  viewMode,
  onViewModeChange,
  onOpenChordLibrary,
  onBack,
  title,
  onTitleChange,
  onTitleBlur,
  importedSong,
  theme,
  onToggleTheme,
  onOpenShortcuts,
  autosaveEnabled,
  onToggleAutosave,
  saveStatus,
  onSave,
  isExportOpen,
  onToggleExport,
  onExportGflow,
  onExportMidi,
  onExportPdf,
  onExportMusicXml,
  onConvertToGflow,
  convertToGflowDisabled,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  user,
  onLogout,
}) => {
  const modes = isImported
    ? [
        { mode: 'practice' as const, label: '練習', icon: Music2 },
      ]
    : [
        { mode: 'create' as const, label: '創作', icon: Edit3 },
        { mode: 'practice' as const, label: '練習', icon: Music2 },
      ];

  const activeDestination: AppDestination = viewMode;

  const navigateRail = (destination: AppDestination) => {
    if (destination === 'library') return onBack();
    if (destination === 'practice') return onViewModeChange('practice');
    if (destination === 'chords') return onOpenChordLibrary();
    if (!isImported) onViewModeChange('create');
  };

  return (
    <>
      <AppRail active={activeDestination} theme={theme} onNavigate={navigateRail} onToggleTheme={onToggleTheme} username={user?.username} />

      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center gap-3 border-b border-[#dedcd4] bg-[#fffefa]/95 px-3 backdrop-blur-xl dark:border-zinc-800 dark:bg-[#171818]/95 sm:px-5 lg:left-[72px] lg:h-[72px] print:hidden">
        <button type="button" onClick={onBack} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[#6e716b] hover:bg-[#f0eee8] dark:text-zinc-400 dark:hover:bg-zinc-900 lg:hidden" aria-label="回到歌曲庫">
          <ArrowLeft size={19} />
        </button>

        <div className="min-w-0 flex-1">
          <input value={title} onChange={event => onTitleChange(event.target.value)} onBlur={onTitleBlur} className="w-full truncate border-0 bg-transparent p-0 text-base font-bold tracking-[-0.02em] text-[#171a18] outline-none dark:text-zinc-50 sm:text-lg" aria-label="歌曲名稱" />
          <div className="mt-0.5 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#85877f] dark:text-zinc-500">
            <span>GuitarFlow Original</span>
            {isImported && importedSong && <><span>·</span><span>{importedSong.importFormat}</span></>}
            {!isImported && <><span>·</span><button type="button" onClick={onToggleAutosave} className={autosaveEnabled ? 'text-[#2b6c59] dark:text-emerald-400' : ''}>自動儲存 {autosaveEnabled ? '開啟' : '關閉'}</button></>}
          </div>
        </div>

        <div className="hidden items-center rounded-xl bg-[#efede7] p-1 dark:bg-zinc-900 md:flex">
          {modes.map(item => (
            <button key={item.mode} type="button" onClick={() => onViewModeChange(item.mode)} className={`h-9 rounded-lg px-3 text-[10px] font-semibold transition-colors ${viewMode === item.mode ? item.mode === 'practice' ? 'bg-[#2b6c59] text-white shadow-sm' : 'bg-[#fffefa] text-[#171a18] shadow-sm dark:bg-zinc-800 dark:text-zinc-100' : 'text-[#777a73] hover:text-[#171a18] dark:text-zinc-500 dark:hover:text-zinc-100'}`}>{item.label}</button>
          ))}
        </div>

        {isImported && onConvertToGflow && (
          <button type="button" onClick={onConvertToGflow} disabled={convertToGflowDisabled} className="hidden rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 disabled:opacity-40 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300 sm:block">
            Make editable
          </button>
        )}

        {!isImported && (
          <div className="hidden items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-zinc-900 sm:flex">
            <button type="button" onClick={onUndo} disabled={!canUndo} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white disabled:opacity-25 dark:text-zinc-400 dark:hover:bg-zinc-800" title="Undo"><Undo2 size={15} /></button>
            <button type="button" onClick={onRedo} disabled={!canRedo} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white disabled:opacity-25 dark:text-zinc-400 dark:hover:bg-zinc-800" title="Redo"><Redo2 size={15} /></button>
          </div>
        )}

        {!isImported && (
          <button type="button" onClick={onSave} className={`${viewMode === 'practice' ? 'hidden sm:flex' : 'flex'} h-10 items-center gap-2 rounded-xl border border-[#dedcd4] bg-[#fffefa] px-3 text-xs font-semibold text-[#5f625c] hover:border-[#bfc2e8] hover:text-[#4d5bd2] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200`}>
            {saveStatus === 'saved' ? <Check size={16} className="text-emerald-500" /> : <Save size={16} />}
            <span className="hidden md:inline">{saveStatus === 'saving' ? 'Saving' : saveStatus === 'saved' ? 'Saved' : 'Save'}</span>
          </button>
        )}

        {!isImported && viewMode === 'practice' && (
          <div className="relative sm:hidden">
            <button type="button" onClick={onToggleExport} aria-label="更多歌曲操作" aria-expanded={isExportOpen} className="grid h-10 w-10 place-items-center rounded-xl border border-[#dedcd4] bg-[#fffefa] text-[#5f625c] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"><MoreHorizontal size={20} /></button>
            {isExportOpen && <div className="absolute right-0 top-12 z-[80] w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
              <button type="button" onClick={() => { onSave(); onToggleExport(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800"><Save size={16} />儲存歌曲</button>
              <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />
              {[
                { label: '匯出 .gflow', action: onExportGflow },
                { label: '匯出 MIDI', action: onExportMidi },
                { label: '列印樂譜', action: onExportPdf },
                { label: '匯出 MusicXML', action: onExportMusicXml },
              ].map(item => <button key={item.label} type="button" onClick={() => { item.action(); onToggleExport(); }} className="block w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800">{item.label}</button>)}
            </div>}
          </div>
        )}
        {!isImported && <div className={viewMode === 'practice' ? 'hidden sm:block' : ''}><ExportMenu open={isExportOpen} onToggle={onToggleExport} onGflow={onExportGflow} onMidi={onExportMidi} onPdf={onExportPdf} onMusicXml={onExportMusicXml} compact={false} /></div>}
        {user && <div className="hidden h-9 items-center gap-2 rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600 dark:bg-zinc-900 dark:text-zinc-300 xl:flex"><User size={14} />{user.username}</div>}
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-[65] grid border-t border-[#dedcd4] bg-[#fffefa]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl dark:border-zinc-800 dark:bg-[#171818]/95 lg:hidden print:hidden" style={{ gridTemplateColumns: `repeat(${modes.length + 2}, minmax(0, 1fr))` }}>
        <button type="button" onClick={onBack} className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[9px] font-semibold text-[#85877f]"><FileMusic size={18} /><span>歌曲庫</span></button>
        {modes.map(item => (
          <button key={item.mode} type="button" onClick={() => onViewModeChange(item.mode)} className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[9px] font-semibold ${viewMode === item.mode ? item.mode === 'practice' ? 'text-[#2b6c59]' : 'text-[#4d5bd2]' : 'text-[#85877f] dark:text-zinc-500'}`}>
            <item.icon size={18} strokeWidth={viewMode === item.mode ? 2.5 : 1.8} />
            {item.label}
          </button>
        ))}
        <button type="button" onClick={onOpenChordLibrary} className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[9px] font-semibold text-[#85877f] dark:text-zinc-500"><Shapes size={18} /><span>和弦庫</span></button>
      </nav>

      <div className="h-16 shrink-0 lg:h-[72px]" aria-hidden="true" />
    </>
  );
};

export default SongShellHeader;
