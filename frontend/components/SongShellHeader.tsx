import React from 'react';
import {
  Music, Save, Download, Eye, Edit3, Book, Undo2, Redo2,
  ArrowLeft, FileText, Sun, Moon, Keyboard, CheckCircle2, ChevronDown, LogOut, User,
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
  const navModes: { mode: ShellViewMode; icon: React.ReactNode; label: string }[] = isImported
    ? [
        { mode: 'preview', icon: <Eye size={16} />, label: 'Preview' },
        { mode: 'practice', icon: <Music size={16} />, label: 'Practice' },
      ]
    : [
        { mode: 'edit', icon: <Edit3 size={16} />, label: 'Edit' },
        { mode: 'preview', icon: <Eye size={16} />, label: 'Preview' },
        { mode: 'practice', icon: <Music size={16} />, label: 'Practice' },
        { mode: 'library', icon: <Book size={16} />, label: 'Chords' },
      ];

  return (
    <header className="sticky top-0 z-50 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white/95 px-3 py-3 shadow-sm backdrop-blur-xl transition-colors duration-200 dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-6 lg:flex-nowrap lg:gap-5">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:max-w-[340px]">
        <button
          onClick={onBack}
          className="p-2 text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all shrink-0"
          title="Back to Home"
        >
          <ArrowLeft size={20} />
        </button>
        <div
          className={`hidden p-2 rounded-xl text-white shadow-sm shrink-0 sm:block ${
            isImported
              ? 'bg-gradient-to-tr from-amber-500 to-orange-600'
              : 'bg-gradient-to-tr from-indigo-600 to-violet-600 dark:from-violet-600 dark:to-fuchsia-600'
          }`}
        >
          <Music size={20} />
        </div>
        <div className="min-w-0">
          <input
            value={title}
            onChange={e => onTitleChange(e.target.value)}
            onBlur={() => onTitleBlur?.()}
            className="w-full truncate border-none bg-transparent text-base font-bold text-slate-800 outline-none focus:border-b focus:border-indigo-500/50 focus:ring-0 dark:text-zinc-100 dark:focus:border-violet-500/50 sm:text-lg"
          />
          {isImported && importedSong && (
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
                {importedSong.importFormat.toUpperCase()}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                Backend · Read-only tab
              </span>
              {onConvertToGflow && (
                <button
                  type="button"
                  onClick={onConvertToGflow}
                  disabled={convertToGflowDisabled}
                  className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-violet-950/40 text-indigo-700 dark:text-violet-300 border border-indigo-200/60 dark:border-violet-900/40 hover:bg-indigo-200/60 dark:hover:bg-violet-950/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Convert to GFlow
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-zinc-900 lg:order-none lg:mx-auto lg:w-auto lg:shrink-0">
        {navModes.map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-all sm:text-sm lg:flex-none lg:px-4 ${
              viewMode === mode
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-violet-400 border border-slate-200/30 dark:border-zinc-800 shadow-sm'
                : 'text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-300'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        {!isImported && (
          <div className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-zinc-800 dark:bg-zinc-900/50 md:flex">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-2 text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 transition-all rounded-lg"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-2 text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 transition-all rounded-lg"
              title="Redo (Ctrl+Y)"
            >
              <Undo2 size={18} className="scale-x-[-1]" />
            </button>
          </div>
        )}

        <button
          onClick={onToggleTheme}
          className="p-2 text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 hover:bg-slate-200/50 dark:hover:bg-zinc-800 rounded-xl transition-all shadow-sm"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {user && onLogout && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl">
            <User size={14} className="text-indigo-600 dark:text-violet-400" />
            <span className="hidden max-w-[80px] truncate text-xs font-bold text-slate-600 dark:text-zinc-300 xl:block">{user.username}</span>
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors"
              title="登出"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

        {!isImported && (
          <>
            <button
              onClick={onOpenShortcuts}
              className="hidden p-2 text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 hover:bg-slate-200/50 dark:hover:bg-zinc-800 rounded-xl transition-all shadow-sm xl:block"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard size={18} />
            </button>
            <button
              onClick={onToggleAutosave}
              className={`hidden px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all md:block ${
                autosaveEnabled
                  ? 'bg-indigo-50 dark:bg-violet-900/40 border-indigo-200 dark:border-violet-800 text-indigo-600 dark:text-violet-400'
                  : 'bg-slate-100 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500'
              }`}
              title="Toggle autosave (30s)"
            >
              Auto {autosaveEnabled ? 'On' : 'Off'}
            </button>
            <button
              onClick={onSave}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-sm font-bold transition-all sm:px-4 ${
                saveStatus === 'saved'
                  ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-indigo-500 dark:hover:border-violet-500 hover:text-indigo-600 dark:hover:text-violet-400 shadow-sm'
              }`}
            >
              {saveStatus === 'saving' ? (
                <div className="w-4 h-4 border-2 border-slate-300 dark:border-zinc-600 border-t-slate-600 dark:border-t-zinc-300 rounded-full animate-spin" />
              ) : saveStatus === 'saved' ? (
                <CheckCircle2 size={18} />
              ) : (
                <Save size={18} />
              )}
              <span className="hidden sm:inline">{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save'}</span>
            </button>
            <div className="relative print:hidden">
              <button
                onClick={onToggleExport}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 p-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 dark:bg-violet-600 dark:hover:bg-violet-500 sm:px-4"
              >
                <Download size={18} /> <span className="hidden sm:inline">Export</span> <ChevronDown size={14} />
              </button>
              {isExportOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    onClick={onExportGflow}
                    className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2.5"
                  >
                    <FileText size={16} className="text-slate-400 dark:text-zinc-500" /> Export Project (.gflow)
                  </button>
                  <button
                    onClick={onExportMidi}
                    className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2.5"
                  >
                    <Music size={16} className="text-indigo-600 dark:text-violet-400" /> Export MIDI (.mid)
                  </button>
                  <button
                    onClick={onExportPdf}
                    className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2.5"
                  >
                    <Eye size={16} className="text-emerald-600 dark:text-emerald-400" /> Export PDF Sheet
                  </button>
                  <button
                    onClick={onExportMusicXml}
                    className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2.5"
                  >
                    <FileText size={16} className="text-sky-600 dark:text-sky-400" /> Export MusicXML
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default SongShellHeader;
