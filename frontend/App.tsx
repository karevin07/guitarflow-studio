
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Music, Plus, Anchor,
  ChevronDown, ChevronUp, FileText, Trash2,
} from 'lucide-react';
import TabMeasure from './components/TabMeasure';
import Fretboard from './components/Fretboard';
import ChordDiagram from './components/ChordDiagram';
import SongPreview from './components/SongPreview';
import ChordManager from './components/ChordManager';
import Home from './components/Home';
import PlayerBar from './components/PlayerBar';
import PracticeView from './components/PracticeView';
import ImportedScorePanel from './components/ImportedScorePanel';
import SongShellHeader from './components/SongShellHeader';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import { ToastContainer } from './components/Toast';
import { ImportedSong, LibrarySong, isImportedSong } from './types';
import { exportToMidi } from './services/midiHelper';
import { readGflowFile } from './services/gflowImport';
import { updateImportedSongTitle } from './services/importedSongsDb';
import { useEditorState, createEmptyMeasure } from './hooks/useEditorState';
import { useSongLibrary } from './hooks/useSongLibrary';
import { useImportedSongs } from './hooks/useImportedSongs';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useToast } from './hooks/useToast';
import { usePlayback } from './hooks/usePlayback';
import { useAutosave } from './hooks/useAutosave';
import { useImportedScore } from './hooks/useImportedScore';
import { useAlphaTabPlayback } from './hooks/useAlphaTabPlayback';
import { useAlphaTabTracks } from './hooks/useAlphaTabTracks';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'home' | 'edit' | 'preview' | 'practice' | 'library'>('home');
  const [activeImportedSong, setActiveImportedSong] = useState<ImportedSong | null>(null);
  const [importedTitle, setImportedTitle] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('guitarflow-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [autosaveEnabled, setAutosaveEnabled] = useState(
    () => localStorage.getItem('guitarflow-autosave') !== 'false'
  );
  const skipDirtyRef = useRef(true);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('guitarflow-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // ─── Toast system ──────────────────────────────────────────────────────────
  const { toasts, dismiss, toast } = useToast();

  // ─── Editor state ──────────────────────────────────────────────────────────
  const editor = useEditorState();

  const playback = usePlayback({
    sections: editor.sections,
    transposeOffset: editor.transposeOffset,
  });

  // ─── Song library ──────────────────────────────────────────────────────────
  const library = useSongLibrary({
    onSongOpened: (title, sections, chords, transpose) => {
      editor.loadSong(title, sections, chords, transpose);
      skipDirtyRef.current = true;
      setIsDirty(false);
      setActiveImportedSong(null);
      setViewMode('edit');
    },
    onError: toast.error,
    onSuccess: toast.success,
  });

  const imported = useImportedSongs({
    onSongOpened: song => {
      setActiveImportedSong(song);
      setImportedTitle(song.title);
      playback.stop();
      setViewMode('practice');
    },
    onError: toast.error,
    onSuccess: toast.success,
  });

  const isImported = !!activeImportedSong;
  const importedScore = useImportedScore(activeImportedSong?.id ?? null, toast.error);
  const alphaPlayback = useAlphaTabPlayback(isImported ? importedScore.api : null);
  const alphaTracks = useAlphaTabTracks(
    isImported ? importedScore.api : null,
    activeImportedSong?.id ?? null
  );

  useEffect(() => {
    if (activeImportedSong) setImportedTitle(activeImportedSong.title);
  }, [activeImportedSong]);

  const librarySongs: LibrarySong[] = [
    ...imported.songs,
    ...library.songs.map(s => ({ ...s, source: 'gflow' as const })),
  ].sort((a, b) => b.lastModified - a.lastModified);

  const performSave = useCallback(() => {
    library.saveCurrentSong({
      title: editor.songTitle,
      sections: editor.sections,
      customChords: editor.customChords,
      transposeOffset: editor.transposeOffset,
    });
  }, [library, editor.songTitle, editor.sections, editor.customChords, editor.transposeOffset]);

  useEffect(() => {
    if (viewMode === 'home' || !library.currentSongId) return;
    if (skipDirtyRef.current) {
      skipDirtyRef.current = false;
      return;
    }
    setIsDirty(true);
  }, [editor.sections, editor.songTitle, editor.customChords, editor.transposeOffset, viewMode, library.currentSongId]);

  useEffect(() => {
    if (library.saveStatus === 'saved') {
      setIsDirty(false);
      skipDirtyRef.current = true;
    }
  }, [library.saveStatus]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty && viewMode !== 'home') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, viewMode]);

  useAutosave({
    enabled: autosaveEnabled,
    delayMs: 30000,
    isDirty,
    canSave: viewMode !== 'home' && !!library.currentSongId && library.saveStatus !== 'saving',
    onSave: performSave,
  });

  const toggleAutosave = () => {
    setAutosaveEnabled(prev => {
      const next = !prev;
      localStorage.setItem('guitarflow-autosave', next ? 'true' : 'false');
      return next;
    });
  };

  // Load songs on mount
  useEffect(() => { library.fetchSongs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Cell input handlers (for keyboard shortcut hook) ─────────────────────
  const handleCellInput = useCallback(
    (sectionId: string, measureIdx: number, stringIdx: number, colIdx: number, value: string) => {
      editor.setSections(prev => {
        const next = prev.map(sec => {
          if (sec.id !== sectionId) return sec;
          const newMeasures = prev
            .find(s => s.id === sectionId)!
            .measures.map(m => m.map(row => [...row]));
          newMeasures[measureIdx][stringIdx][colIdx] = value;
          return { ...sec, measures: newMeasures };
        });
        editor.commitToHistory(next);
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor.commitToHistory]
  );

  const handleCellClear = useCallback(
    (sectionId: string, measureIdx: number, stringIdx: number, colIdx: number) => {
      handleCellInput(sectionId, measureIdx, stringIdx, colIdx, '-');
    },
    [handleCellInput]
  );

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  useKeyboardShortcuts({
    viewMode,
    selection: editor.selection,
    setSelection: editor.setSelection,
    sections: editor.sections,
    undo: editor.undo,
    redo: editor.redo,
    onCellInput: handleCellInput,
    onCellClear: handleCellClear,
    onOpenHelp: () => setShortcutsOpen(true),
  });

  // ─── Create new song ───────────────────────────────────────────────────────
  const createNewSong = () => {
    const initialSection = {
      id: Math.random().toString(36).slice(2, 11),
      title: 'Intro',
      capo: 0,
      measures: [createEmptyMeasure()],
      chords: [Array(16).fill(null)],
      lyrics: [Array(16).fill(null)],
    };
    library.createNewSong({
      title: 'New Song',
      sections: [initialSection],
      customChords: [],
      transposeOffset: 0,
    });
  };

  // ─── Save ──────────────────────────────────────────────────────────────────
  const saveCurrentSong = () => {
    performSave();
  };

  // ─── Export ────────────────────────────────────────────────────────────────
  const exportAsFile = () => {
    const blob = new Blob(
      [JSON.stringify({
        title: editor.songTitle,
        sections: editor.sections,
        customChords: editor.customChords,
        transposeOffset: editor.transposeOffset,
      }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${editor.songTitle.replace(/\s+/g, '_')}.gflow`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const triggerMidiExport = () => {
    exportToMidi(editor.songTitle, editor.sections, editor.transposeOffset);
  };

  const triggerPdfExport = () => {
    // Use afterprint event instead of a setTimeout chain to avoid race conditions
    if (viewMode !== 'preview') {
      const prevView = viewMode;
      window.addEventListener('afterprint', () => setViewMode(prevView), { once: true });
      setViewMode('preview');
      setTimeout(() => window.print(), 300);
    } else {
      window.print();
    }
  };

  const handleImportFile = useCallback(async (file: File) => {
    const result = await readGflowFile(file);
    if (result.ok === false) {
      toast.error(result.error);
      return;
    }
    await library.importSong(result.data);
  }, [library, toast]);

  const handleOpenLibrarySong = useCallback((song: LibrarySong) => {
    if (isImportedSong(song)) {
      imported.openSong(song);
      return;
    }
    library.openSong(song);
  }, [imported, library]);

  const handleDeleteLibrarySong = useCallback((song: LibrarySong) => {
    if (isImportedSong(song)) {
      imported.deleteSong(song.id);
      if (activeImportedSong?.id === song.id) {
        goHome();
      }
      return;
    }
    library.deleteSong(song.id);
  }, [activeImportedSong?.id, imported, library]);

  const handleImportedTitleChange = useCallback(async (title: string) => {
    if (!activeImportedSong) return;
    const trimmed = title.trim() || activeImportedSong.title;
    setImportedTitle(trimmed);
    await updateImportedSongTitle(activeImportedSong.id, trimmed);
    setActiveImportedSong(prev => (prev ? { ...prev, title: trimmed, lastModified: Date.now() } : prev));
    imported.refresh();
  }, [activeImportedSong, imported]);

  const goHome = useCallback(() => {
    playback.stop();
    alphaPlayback.onStop();
    setActiveImportedSong(null);
    setViewMode('home');
  }, [playback, alphaPlayback]);

  // ─── Derived state ─────────────────────────────────────────────────────────
  const currentSection = editor.sections.find(s => s.id === editor.activeSectionId);
  const activeChord = editor.getActiveChord(currentSection);
  const selectionPosition = editor.selection
    ? (() => {
        const sectionIdx = editor.sections.findIndex(s => s.id === editor.selection!.sectionId);
        return sectionIdx >= 0
          ? { sectionIdx, measureIdx: editor.selection!.measureIdx, colIdx: editor.selection!.colIdx }
          : null;
      })()
    : null;

  // ─── Home view ─────────────────────────────────────────────────────────────
  if (viewMode === 'home') {
    return (
      <>
        <Home
          songs={librarySongs}
          onCreateNew={createNewSong}
          onOpen={handleOpenLibrarySong}
          onDelete={handleDeleteLibrarySong}
          onImportGflow={handleImportFile}
          onImportGp={imported.importFile}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </>
    );
  }


  // ─── Song shell (gflow + imported) ─────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 selection:bg-indigo-500/20 dark:selection:bg-violet-500/30 selection:text-indigo-900 dark:selection:text-violet-200 transition-colors duration-200">
      <SongShellHeader
        isImported={isImported}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onBack={goHome}
        title={isImported ? importedTitle : editor.songTitle}
        onTitleChange={title => {
          if (isImported) setImportedTitle(title);
          else editor.setSongTitle(title);
        }}
        onTitleBlur={() => {
          if (isImported) handleImportedTitleChange(importedTitle);
        }}
        importedSong={activeImportedSong}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        autosaveEnabled={autosaveEnabled}
        onToggleAutosave={toggleAutosave}
        saveStatus={library.saveStatus}
        onSave={saveCurrentSong}
        isExportOpen={isExportOpen}
        onToggleExport={() => setIsExportOpen(v => !v)}
        onExportGflow={() => { exportAsFile(); setIsExportOpen(false); }}
        onExportMidi={() => { triggerMidiExport(); setIsExportOpen(false); }}
        onExportPdf={() => { triggerPdfExport(); setIsExportOpen(false); }}
        canUndo={editor.historyIndex > 0}
        canRedo={editor.historyIndex < editor.history.length - 1}
        onUndo={editor.undo}
        onRedo={editor.redo}
      />

      {/* ─ Main ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden">
        {isImported && activeImportedSong && (viewMode === 'preview' || viewMode === 'practice') && (
          <ImportedScorePanel
            songId={activeImportedSong.id}
            scoreData={importedScore.scoreData}
            loading={importedScore.loading}
            onReady={importedScore.onApiReady}
            onScoreLoaded={loadedTitle => {
              if (loadedTitle && loadedTitle !== importedTitle) {
                setImportedTitle(loadedTitle);
                handleImportedTitleChange(loadedTitle);
              }
            }}
            onError={toast.error}
            tracks={alphaTracks.tracks}
            selectedTracks={alphaTracks.selected}
            onToggleTrack={alphaTracks.toggleTrack}
            onSelectAllTracks={alphaTracks.selectAll}
            onSelectGuitarTracks={alphaTracks.selectGuitarTracks}
          />
        )}

        {!isImported && viewMode === 'edit' && (
          <>
            {/* Sections sidebar */}
            <aside className="w-64 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-md border-r border-slate-200 dark:border-zinc-800/80 flex flex-col transition-colors duration-250">
              <div className="p-6 border-b border-slate-200 dark:border-zinc-800/80 flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Sections</h3>
                <button onClick={editor.addSection} className="p-1 text-indigo-600 dark:text-violet-400 hover:bg-indigo-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors">
                  <Plus size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {editor.sections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    className={`group flex items-center gap-1 rounded-xl border transition-all ${
                      editor.activeSectionId === sec.id
                        ? 'border-indigo-500 bg-indigo-50/70 dark:border-violet-500 dark:bg-violet-500/10 shadow-md'
                        : 'border-transparent hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <button
                      onClick={() => editor.setActiveSectionId(sec.id)}
                      className={`flex-1 text-left px-4 py-3 text-sm font-bold transition-all ${
                        editor.activeSectionId === sec.id
                          ? 'text-indigo-600 dark:text-violet-400'
                          : 'text-slate-500 dark:text-zinc-400'
                      }`}
                    >
                      {sec.title}
                    </button>
                    <div className="flex flex-col pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); editor.moveSection(sec.id, 'up'); }}
                        disabled={idx === 0}
                        className="p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-violet-400 disabled:opacity-30"
                        title="Move up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); editor.moveSection(sec.id, 'down'); }}
                        disabled={idx === editor.sections.length - 1}
                        className="p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-violet-400 disabled:opacity-30"
                        title="Move down"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (editor.sections.length <= 1) return;
                        if (confirm(`Delete section "${sec.title}"?`)) editor.deleteSection(sec.id);
                      }}
                      disabled={editor.sections.length <= 1}
                      className="p-2 mr-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 disabled:opacity-30 transition-all"
                      title="Delete section"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </aside>

            {/* Tab editor */}
            <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-zinc-950 p-8 flex flex-col gap-8 transition-colors duration-250">
              {currentSection && (
                <div className="bg-white/80 dark:bg-zinc-900/20 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800/60 p-8 shadow-md dark:shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-6">
                      <input
                        value={currentSection.title}
                        onChange={e => editor.updateSectionTitle(editor.activeSectionId, e.target.value)}
                        className="text-2xl font-bold text-slate-800 dark:text-zinc-100 border-b-2 border-transparent focus:border-indigo-500 dark:focus:border-violet-500 outline-none bg-transparent transition-all"
                      />
                      <div className="h-8 w-[1px] bg-slate-200 dark:bg-zinc-800" />
                      <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 group transition-colors">
                        <Anchor size={14} className="text-slate-400 dark:text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-violet-400 transition-colors" />
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Capo</span>
                        <select
                          value={currentSection.capo}
                          onChange={e => editor.setCapo(editor.activeSectionId, parseInt(e.target.value, 10))}
                          className="bg-transparent text-sm font-bold text-slate-600 dark:text-zinc-300 outline-none cursor-pointer"
                        >
                          {Array.from({ length: 13 }).map((_, i) => (
                            <option key={i} value={i} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-300">
                              {i === 0 ? 'None' : i}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={() => editor.addMeasure(editor.activeSectionId)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-violet-900/40 text-indigo-600 dark:text-violet-400 border border-indigo-200/50 dark:border-violet-900/30 rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      <Plus size={16} /> Add Measure
                    </button>
                  </div>

                  {/* Measures grid: 2 per row on xl screens */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-16">
                    {currentSection.measures.map((measure, mIdx) => {
                      const isSecPlaying = playback.playState && editor.sections[playback.playState.sectionIdx]?.id === currentSection.id;
                      const isMeasPlaying = isSecPlaying && playback.playState?.measureIdx === mIdx;

                      return (
                        <div key={mIdx} className="w-full overflow-x-auto xl:overflow-visible">
                          <TabMeasure
                            measure={measure}
                            chords={currentSection.chords[mIdx]}
                            lyrics={currentSection.lyrics[mIdx]}
                            activeCol={editor.selection?.measureIdx === mIdx ? editor.selection.colIdx : null}
                            activeString={editor.selection?.measureIdx === mIdx ? editor.selection.stringIdx : null}
                            playCol={isMeasPlaying ? playback.playState!.colIdx : null}
                            onCellClick={(sIdx, cIdx) => editor.setSelection({ sectionId: editor.activeSectionId, measureIdx: mIdx, stringIdx: sIdx, colIdx: cIdx })}
                            onChordClick={(cIdx) => editor.setSelection({ sectionId: editor.activeSectionId, measureIdx: mIdx, stringIdx: 0, colIdx: cIdx })}
                            onChordNameChange={(cIdx, name) => editor.handleChordNameChange(editor.activeSectionId, mIdx, cIdx, name)}
                            onLyricChange={(cIdx, text) => editor.updateLyric(editor.activeSectionId, mIdx, cIdx, text)}
                            onDelete={() => editor.deleteMeasure(editor.activeSectionId, mIdx)}
                            onCopy={() => editor.copyMeasure(editor.activeSectionId, mIdx)}
                            onClearColumn={(cIdx) => editor.clearColumn(editor.activeSectionId, mIdx, cIdx)}
                            onDropChord={(cIdx, chordName) => editor.handleDropChord(editor.activeSectionId, mIdx, cIdx, chordName)}
                            canDelete={currentSection.measures.length > 1}
                            theme={theme}
                          />
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Fretboard Panel */}
                  {editor.selection && (
                    <div className="mt-12 bg-white/70 dark:bg-zinc-900/35 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-zinc-800/60 shadow-md animate-in slide-in-from-bottom-2 duration-200">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                            Interactive Guitar Fretboard
                          </h4>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">Select a cell in the tab above, then click a fret below to write a note.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-violet-400 uppercase tracking-widest bg-indigo-50 dark:bg-violet-900/40 px-3 py-1.5 rounded-xl border border-indigo-100/50 dark:border-violet-900/30">
                            Focused: Measure {editor.selection.measureIdx + 1}, String {editor.selection.stringIdx + 1}, Col {editor.selection.colIdx + 1}
                          </span>
                        </div>
                      </div>
                      <Fretboard 
                        selectedString={editor.selection.stringIdx}
                        selectedCol={editor.selection.colIdx}
                        onNoteClick={(stringIdx, fret) => {
                          const { sectionId, measureIdx, colIdx } = editor.selection!;
                          handleCellInput(sectionId, measureIdx, stringIdx, colIdx, fret.toString());
                        }} 
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chord tools sidebar */}
            <aside className="w-80 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-md border-l border-slate-200 dark:border-zinc-800/80 flex flex-col overflow-hidden transition-colors duration-250">
              <div className="p-6 border-b border-slate-200 dark:border-zinc-800/80">
                <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Chord Tools</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {activeChord ? (
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase">Selected / Detected</span>
                    <div className="h-64">
                      <ChordDiagram chord={activeChord} theme={theme} />
                    </div>
                  </div>
                ) : (
                  <div className="h-64 bg-slate-100/50 dark:bg-zinc-950/40 rounded-3xl border border-slate-200 dark:border-zinc-800 flex items-center justify-center p-8 text-center shadow-inner">
                    <p className="text-xs font-semibold text-slate-400 dark:text-zinc-600">Select a column or enter notes to see a chord preview</p>
                  </div>
                )}

                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-slate-450 dark:text-zinc-550 uppercase">Chord Library</span>
                  <div className="grid grid-cols-2 gap-2">
                    {editor.chordLibrary.map((chord, i) => (
                      <button
                        key={`${chord.name}-${i}`}
                        draggable="true"
                        onDragStart={e => { e.dataTransfer.setData('chordName', chord.name); }}
                        onClick={() => editor.handleChordInput(chord, editor.selection)}
                        className="cursor-grab active:cursor-grabbing px-4 py-3 bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-855 rounded-xl text-sm font-bold text-slate-605 dark:text-zinc-355 hover:border-indigo-500 dark:hover:border-violet-500 hover:bg-indigo-50 dark:hover:bg-violet-955/20 hover:text-indigo-650 dark:hover:text-violet-400 transition-all flex items-center justify-center shadow-sm"
                      >
                        {chord.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </>
        )}

        {/* ── Preview view ─────────────────────────────────────────────────── */}
        {!isImported && viewMode === 'preview' && (
          <div className="flex-1 p-8 overflow-y-auto bg-slate-100 dark:bg-zinc-950 transition-colors duration-250">
            <SongPreview
              sections={editor.sections}
              customChords={editor.customChords}
              globalChords={editor.globalChords}
              externalTranspose={editor.transposeOffset}
              onTransposeChange={editor.setTransposeOffset}
              theme={theme}
            />
          </div>
        )}

        {/* ── Practice view ───────────────────────────────────────────────── */}
        {!isImported && viewMode === 'practice' && (
          <PracticeView
            sections={editor.sections}
            activeSectionId={editor.activeSectionId}
            playState={playback.playState}
            theme={theme}
            onSelectSection={editor.setActiveSectionId}
            onSelectCell={(sectionId, measureIdx, stringIdx, colIdx) =>
              editor.setSelection({ sectionId, measureIdx, stringIdx, colIdx })
            }
          />
        )}

        {/* ── Chord library view ───────────────────────────────────────────── */}
        {!isImported && viewMode === 'library' && (
          <ChordManager
            customChords={editor.customChords}
            globalChords={editor.globalChords}
            onAddChord={c => editor.setCustomChords([...editor.customChords, c])}
            onDeleteChord={name => editor.setCustomChords(editor.customChords.filter(c => c.name !== name))}
            theme={theme}
          />
        )}
      </main>

      {(isImported ? viewMode === 'practice' : (viewMode === 'edit' || viewMode === 'preview' || viewMode === 'practice')) && (
        isImported ? (
          <PlayerBar {...alphaPlayback} />
        ) : (
        <PlayerBar
          mode="gflow"
          isPlaying={playback.isPlaying}
          isPaused={playback.isPaused}
          onTogglePlayPause={() => {
            if (!playback.isPlaying && (selectionPosition || playback.isPaused)) {
              playback.play(selectionPosition ?? undefined);
              return;
            }
            playback.togglePlayPause();
          }}
          onStop={playback.stop}
          playIndex={playback.playIndex}
          totalCols={playback.totalCols}
          onSeek={playback.seek}
          abLoop={playback.abLoop}
          onSetLoopA={playback.setLoopA}
          onSetLoopB={playback.setLoopB}
          onToggleAbLoop={playback.toggleAbLoop}
          onClearAbLoop={playback.clearAbLoop}
          playBpm={playback.playBpm}
          onBpmChange={playback.setPlayBpm}
          isLooping={playback.isLooping}
          onToggleLoop={() => playback.setIsLooping(v => !v)}
          isMetronomeOn={playback.isMetronomeOn}
          onToggleMetronome={() => playback.setIsMetronomeOn(v => !v)}
          playbackVolume={playback.playbackVolume}
          onVolumeChange={playback.setPlaybackVolume}
        />
        )
      )}

      {/* ─ Toast notifications ─────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
};

export default App;
