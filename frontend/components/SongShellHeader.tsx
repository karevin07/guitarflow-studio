import React from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  Download,
  Edit3,
  Eye,
  FileMusic,
  FileText,
  Guitar,
  Keyboard,
  LogOut,
  Moon,
  Music2,
  Redo2,
  Save,
  Sun,
  Undo2,
  User,
} from 'lucide-react';
import { ImportedSong } from '../types';
import { AuthUser } from '../services/apiClient';

type ShellViewMode = 'edit' | 'preview' | 'practice' | 'library';

interface SongShellHeaderProps {
  isImported: boolean;
  viewMode: ShellViewMode;
  onViewModeChange: (mode: ShellViewMode) => void;
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
        { mode: 'preview' as const, label: 'Read', icon: Eye },
        { mode: 'practice' as const, label: 'Practice', icon: Music2 },
      ]
    : [
        { mode: 'edit' as const, label: 'Create', icon: Edit3 },
        { mode: 'preview' as const, label: 'Read', icon: Eye },
        { mode: 'practice' as const, label: 'Practice', icon: Music2 },
        { mode: 'library' as const, label: 'Learn', icon: BookOpen },
      ];

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-[60] hidden w-[84px] flex-col items-center border-r border-slate-200 bg-white py-4 dark:border-zinc-800 dark:bg-zinc-950 lg:flex print:hidden">
        <button type="button" onClick={onBack} className="group mb-7 grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white transition-all hover:rounded-xl hover:bg-indigo-600 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-violet-400" title="Back to library">
          <Guitar size={20} />
        </button>

        <nav className="flex w-full flex-col items-center gap-2 px-2">
          {modes.map(item => (
            <button
              key={item.mode}
              type="button"
              onClick={() => onViewModeChange(item.mode)}
              className={`group flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[9px] font-semibold transition-colors ${viewMode === item.mode ? 'bg-indigo-50 text-indigo-700 dark:bg-violet-950/50 dark:text-violet-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <item.icon size={18} strokeWidth={viewMode === item.mode ? 2.4 : 1.8} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-2">
          {!isImported && (
            <button type="button" onClick={onOpenShortcuts} className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-100" title="Keyboard shortcuts">
              <Keyboard size={17} />
            </button>
          )}
          <button type="button" onClick={onToggleTheme} className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-100" title="Toggle theme">
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {user && onLogout && (
            <button type="button" onClick={onLogout} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:text-red-500 dark:bg-zinc-900 dark:text-zinc-400" title={`Sign out ${user.username}`}>
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-3 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90 sm:px-5 lg:left-[84px] lg:h-[72px] print:hidden">
        <button type="button" onClick={onBack} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-900 lg:hidden" aria-label="Back to library">
          <ArrowLeft size={19} />
        </button>

        <div className="min-w-0 flex-1">
          <input value={title} onChange={event => onTitleChange(event.target.value)} onBlur={onTitleBlur} className="w-full truncate border-0 bg-transparent p-0 text-base font-bold tracking-tight text-slate-900 outline-none dark:text-zinc-50 sm:text-lg" aria-label="Song title" />
          <div className="mt-0.5 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-zinc-500">
            <span>{modes.find(item => item.mode === viewMode)?.label} mode</span>
            {isImported && importedSong && <><span>·</span><span>{importedSong.importFormat}</span></>}
            {!isImported && <><span>·</span><button type="button" onClick={onToggleAutosave} className={autosaveEnabled ? 'text-emerald-600 dark:text-emerald-400' : ''}>Autosave {autosaveEnabled ? 'on' : 'off'}</button></>}
          </div>
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
          <button type="button" onClick={onSave} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-violet-700 dark:hover:text-violet-400">
            {saveStatus === 'saved' ? <Check size={16} className="text-emerald-500" /> : <Save size={16} />}
            <span className="hidden md:inline">{saveStatus === 'saving' ? 'Saving' : saveStatus === 'saved' ? 'Saved' : 'Save'}</span>
          </button>
        )}

        {!isImported && <ExportMenu open={isExportOpen} onToggle={onToggleExport} onGflow={onExportGflow} onMidi={onExportMidi} onPdf={onExportPdf} onMusicXml={onExportMusicXml} compact={false} />}
        {user && <div className="hidden h-9 items-center gap-2 rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600 dark:bg-zinc-900 dark:text-zinc-300 xl:flex"><User size={14} />{user.username}</div>}
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-[65] grid border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden print:hidden" style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}>
        {modes.map(item => (
          <button key={item.mode} type="button" onClick={() => onViewModeChange(item.mode)} className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[9px] font-semibold ${viewMode === item.mode ? 'text-indigo-600 dark:text-violet-400' : 'text-slate-400 dark:text-zinc-500'}`}>
            <item.icon size={18} strokeWidth={viewMode === item.mode ? 2.5 : 1.8} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="h-16 shrink-0 lg:h-[72px]" aria-hidden="true" />
    </>
  );
};

export default SongShellHeader;
