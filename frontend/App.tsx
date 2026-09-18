
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import EditView from './components/EditView';
import SongPreview from './components/SongPreview';
import Home from './components/Home';
import HomeChordLab from './components/HomeChordLab';
import PlayerBar from './components/PlayerBar';
import ImportedScorePanel from './components/ImportedScorePanel';
import SongShellHeader from './components/SongShellHeader';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import ImportPreviewModal from './components/ImportPreviewModal';
import AuthModal from './components/AuthModal';
import { ToastContainer } from './components/Toast';
import { ImportedSong, LibrarySong, isImportedSong } from './types';
import { exportToMidi } from './services/midiHelper';
import { readGflowFile } from './services/gflowImport';
import { downloadMusicXml } from './services/musicXmlExport';
import { convertAlphaTabScoreToGflow, pickGuitarTrackIndex } from './services/gpToGflow';
import { api as songApi } from './services/api';
import { getTechniqueInputHint } from './services/tabNotation';
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
import { useAuth } from './hooks/useAuth';
import { DEFAULT_TIME_SIGNATURE } from './constants/practice';
import { appPaths, parseAppRoute } from './services/routes';

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const route = useMemo(() => parseAppRoute(location.pathname), [location.pathname]);
  const viewMode: 'home' | 'edit' | 'preview' = route.name === 'create' ? 'edit' : route.name === 'practice' ? 'preview' : 'home';
  const [activeImportedSong, setActiveImportedSong] = useState<ImportedSong | null>(null);
  const [importedTitle, setImportedTitle] = useState('');
  const [gpPreviewFile, setGpPreviewFile] = useState<File | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('guitarflow-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'light';
  });
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [libraryReady, setLibraryReady] = useState(false);
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
  const auth = useAuth();

  // ─── Editor state ──────────────────────────────────────────────────────────
  const editor = useEditorState();

  const playback = usePlayback({
    sections: editor.sections,
    transposeOffset: editor.transposeOffset,
    chordLibrary: editor.chordLibrary,
  });

  // ─── Song library ──────────────────────────────────────────────────────────
  const library = useSongLibrary({
    onSongOpened: (title, sections, chords, transpose) => {
      editor.loadSong(title, sections, chords, transpose);
      skipDirtyRef.current = true;
      setIsDirty(false);
      setActiveImportedSong(null);
    },
    onError: toast.error,
    onSuccess: toast.success,
  });

  const imported = useImportedSongs({
    onSongOpened: song => {
      setActiveImportedSong(song);
      setImportedTitle(song.title);
      playback.stop();
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

  const librarySongs: LibrarySong[] = useMemo(() => [
    ...imported.songs,
    ...library.songs.map(s => ({ ...s, source: 'gflow' as const })),
  ].sort((a, b) => b.lastModified - a.lastModified), [imported.songs, library.songs]);

  useEffect(() => {
    if (location.pathname === '/') {
      navigate(appPaths.songs, { replace: true });
    } else if (route.name === 'not-found') {
      navigate(appPaths.songs, { replace: true });
    }
  }, [location.pathname, navigate, route.name]);

  useEffect(() => {
    if (route.name !== 'create' && route.name !== 'practice') return;
    if (auth.loading) return;
    if (!auth.user) {
      setAuthOpen(true);
      return;
    }
    if (!libraryReady) return;

    const song = librarySongs.find(candidate => candidate.id === route.songId);
    if (!song) {
      toast.error('找不到這首歌曲，已返回歌曲庫。');
      navigate(appPaths.songs, { replace: true });
      return;
    }

    if (isImportedSong(song)) {
      if (route.name === 'create') {
        navigate(appPaths.practice(song.id), { replace: true });
        return;
      }
      if (activeImportedSong?.id !== song.id) imported.openSong(song);
      return;
    }

    if (library.currentSongId !== song.id || activeImportedSong) library.openSong(song);
  }, [activeImportedSong, auth.loading, auth.user, imported, library, libraryReady, librarySongs, navigate, route, toast]);

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

  // Load library when authenticated
  useEffect(() => {
    if (!auth.user) {
      setLibraryReady(false);
      return;
    }
    setLibraryReady(false);
    Promise.all([library.fetchSongs(), imported.refresh()]).finally(() => setLibraryReady(true));
  }, [auth.user]); // eslint-disable-line react-hooks/exhaustive-deps

  const requireAuth = useCallback(() => {
    if (auth.user) return true;
    setAuthOpen(true);
    return false;
  }, [auth.user]);

  const handleLogout = useCallback(async () => {
    playback.stop();
    alphaPlayback.onStop();
    await auth.logout();
    setActiveImportedSong(null);
    navigate(appPaths.songs, { replace: true });
  }, [auth, playback, alphaPlayback, navigate]);

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
  const createNewSong = async () => {
    if (!requireAuth()) return;
    const initialSection = {
      id: Math.random().toString(36).slice(2, 11),
      title: 'Intro',
      capo: 0,
      timeSignature: [...DEFAULT_TIME_SIGNATURE] as [number, number],
      measures: [createEmptyMeasure()],
      chords: [Array(16).fill(null)],
      lyrics: [Array(16).fill(null)],
    };
    const song = await library.createNewSong({
      title: 'New Song',
      sections: [initialSection],
      customChords: [],
      transposeOffset: 0,
    });
    if (song) navigate(appPaths.create(song.id));
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
    if (route.name === 'create' && library.currentSongId) {
      const returnPath = appPaths.create(library.currentSongId);
      window.addEventListener('afterprint', () => navigate(returnPath), { once: true });
      navigate(appPaths.practice(library.currentSongId));
      setTimeout(() => window.print(), 300);
    } else {
      window.print();
    }
  };

  const triggerMusicXmlExport = () => {
    downloadMusicXml({
      title: editor.songTitle,
      sections: editor.sections,
      transposeOffset: editor.transposeOffset,
    });
  };

  const handleConvertGpToGflow = useCallback(async () => {
    const alphaApi = importedScore.api;
    if (!alphaApi?.score) {
      toast.error('Score not loaded yet. Please wait.');
      return;
    }
    const trackIdx = pickGuitarTrackIndex(alphaApi.score);
    const gflow = convertAlphaTabScoreToGflow(alphaApi.score, trackIdx);
    if (!gflow) {
      toast.error('Could not extract tab from this score.');
      return;
    }
    const song = await library.importSong(gflow);
    if (song) navigate(appPaths.create(song.id));
  }, [importedScore.api, library, navigate, toast]);

  const handleClaimSong = useCallback(async (song: LibrarySong) => {
    try {
      await songApi.claimSong(song.id);
      await library.fetchSongs();
      await imported.refresh();
      toast.success(`已認領「${song.title}」`);
    } catch {
      toast.error('認領失敗，請稍後再試。');
    }
  }, [library, imported, toast]);

  const handleClaimAllLegacy = useCallback(async () => {
    try {
      const { claimed } = await songApi.claimLegacySongs();
      await library.fetchSongs();
      await imported.refresh();
      toast.success(claimed > 0 ? `已認領 ${claimed} 首舊版樂譜` : '沒有需要認領的樂譜');
    } catch {
      toast.error('批量認領失敗，請稍後再試。');
    }
  }, [library, imported, toast]);

  const handleImportFile = useCallback(async (file: File) => {
    if (!requireAuth()) return;
    const result = await readGflowFile(file);
    if (result.ok === false) {
      toast.error(result.error);
      return;
    }
    const song = await library.importSong(result.data);
    if (song) navigate(appPaths.create(song.id));
  }, [library, navigate, toast, requireAuth]);

  const handleOpenLibrarySong = useCallback((song: LibrarySong) => {
    if (isImportedSong(song)) {
      imported.openSong(song);
      navigate(appPaths.practice(song.id));
      return;
    }
    library.openSong(song);
    navigate(appPaths.create(song.id));
  }, [imported, library, navigate]);

  const handleOpenLibrarySongInMode = useCallback((song: LibrarySong, mode: 'create' | 'practice') => {
    if (isImportedSong(song)) imported.openSong(song);
    else library.openSong(song);
    navigate(mode === 'create' && !isImportedSong(song) ? appPaths.create(song.id) : appPaths.practice(song.id));
  }, [imported, library, navigate]);

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
    await imported.updateTitle(activeImportedSong.id, trimmed);
    setActiveImportedSong(prev => (prev ? { ...prev, title: trimmed, lastModified: Date.now() } : prev));
    imported.refresh();
  }, [activeImportedSong, imported]);

  const goHome = useCallback(() => {
    playback.stop();
    alphaPlayback.onStop();
    setActiveImportedSong(null);
    navigate(appPaths.songs);
  }, [playback, alphaPlayback, navigate]);

  // ─── Derived state ─────────────────────────────────────────────────────────
  const currentSection = editor.sections.find(s => s.id === editor.activeSectionId);
  const activeChord = editor.getActiveChord(currentSection);
  const techniqueHint = editor.selection && currentSection
    ? getTechniqueInputHint(
        currentSection.measures[editor.selection.measureIdx]?.[editor.selection.stringIdx]?.[editor.selection.colIdx] ?? '-'
      )
    : null;
  const selectionPosition = editor.selection
    ? (() => {
        const sectionIdx = editor.sections.findIndex(s => s.id === editor.selection!.sectionId);
        return sectionIdx >= 0
          ? { sectionIdx, measureIdx: editor.selection!.measureIdx, colIdx: editor.selection!.colIdx }
          : null;
      })()
    : null;

  // ─── Home view ─────────────────────────────────────────────────────────────
  if (viewMode === 'home' || ((route.name === 'create' || route.name === 'practice') && !auth.user)) {
    if (route.name === 'chords') {
      return (
        <HomeChordLab
          globalChords={editor.globalChords}
          theme={theme}
          onBack={() => navigate(appPaths.songs)}
          onToggleTheme={toggleTheme}
          initialChord={route.symbol}
        />
      );
    }
    return (
      <>
        <Home
          songs={librarySongs}
          user={auth.user}
          authLoading={auth.loading}
          onOpenAuth={() => setAuthOpen(true)}
          onLogout={handleLogout}
          onCreateNew={createNewSong}
          onOpenChordLab={chord => navigate(appPaths.chords(chord))}
          onOpen={handleOpenLibrarySong}
          onOpenRead={song => handleOpenLibrarySongInMode(song, 'practice')}
          onOpenPractice={song => handleOpenLibrarySongInMode(song, 'practice')}
          onDelete={handleDeleteLibrarySong}
          onImportGflow={handleImportFile}
          onImportGp={file => {
            if (!requireAuth()) return;
            setGpPreviewFile(file);
          }}
          onClaimSong={handleClaimSong}
          onClaimAllLegacy={handleClaimAllLegacy}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onLogin={auth.login}
          onRegister={auth.register}
        />
        {gpPreviewFile && (
          <ImportPreviewModal
            file={gpPreviewFile}
            onConfirm={async title => {
              const song = await imported.importFile(gpPreviewFile, title);
              setGpPreviewFile(null);
              if (song) navigate(appPaths.practice(song.id));
            }}
            onCancel={() => setGpPreviewFile(null)}
            onError={toast.error}
          />
        )}
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </>
    );
  }


  // ─── Song shell (gflow + imported) ─────────────────────────────────────────
  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#f7f5ef] dark:bg-[#151616] text-[#171a18] dark:text-zinc-100 selection:bg-indigo-500/20 dark:selection:bg-violet-500/30 selection:text-indigo-900 dark:selection:text-violet-200 transition-colors duration-200 lg:pl-[72px] print:h-auto print:overflow-visible print:pl-0">
      <SongShellHeader
        isImported={isImported}
        viewMode={route.name === 'create' ? 'create' : 'practice'}
        onViewModeChange={mode => {
          if (route.name !== 'create' && route.name !== 'practice') return;
          navigate(mode === 'create' ? appPaths.create(route.songId) : appPaths.practice(route.songId));
        }}
        onOpenChordLibrary={() => navigate(appPaths.chords())}
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
        onExportMusicXml={() => { triggerMusicXmlExport(); setIsExportOpen(false); }}
        onConvertToGflow={isImported ? handleConvertGpToGflow : undefined}
        convertToGflowDisabled={isImported && (!importedScore.api?.score || importedScore.loading)}
        canUndo={editor.historyIndex > 0}
        canRedo={editor.historyIndex < editor.history.length - 1}
        onUndo={editor.undo}
        onRedo={editor.redo}
        user={auth.user}
        onLogout={handleLogout}
      />

      {/* ─ Main ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden pb-16 lg:pb-0">
        {isImported && activeImportedSong && route.name === 'practice' && (
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

        {!isImported && route.name === 'create' && (
          <EditView
            sections={editor.sections}
            activeSectionId={editor.activeSectionId}
            selection={editor.selection}
            playState={playback.playState}
            theme={theme}
            techniqueHint={techniqueHint}
            activeChord={activeChord}
            chordLibrary={editor.chordLibrary}
            canUndo={editor.historyIndex > 0}
            canRedo={editor.historyIndex < editor.history.length - 1}
            onSetActiveSection={editor.setActiveSectionId}
            onAddSection={editor.addSection}
            onMoveSection={editor.moveSection}
            onDeleteSection={editor.deleteSection}
            onUpdateSectionTitle={title => editor.updateSectionTitle(editor.activeSectionId, title)}
            onSetTimeSignature={ts => editor.setTimeSignature(editor.activeSectionId, ts)}
            onSetCapo={capo => editor.setCapo(editor.activeSectionId, capo)}
            onAddMeasure={() => editor.addMeasure(editor.activeSectionId)}
            onSetSelection={editor.setSelection}
            onChordNameChange={(mIdx, cIdx, name) =>
              editor.handleChordNameChange(editor.activeSectionId, mIdx, cIdx, name)
            }
            onLyricChange={(mIdx, cIdx, text) =>
              editor.updateLyric(editor.activeSectionId, mIdx, cIdx, text)
            }
            onDeleteMeasure={mIdx => editor.deleteMeasure(editor.activeSectionId, mIdx)}
            onCopyMeasure={mIdx => editor.copyMeasure(editor.activeSectionId, mIdx)}
            onClearColumn={(mIdx, cIdx) => editor.clearColumn(editor.activeSectionId, mIdx, cIdx)}
            onDropChord={(mIdx, cIdx, chordName) =>
              editor.handleDropChord(editor.activeSectionId, mIdx, cIdx, chordName)
            }
            onCellInput={handleCellInput}
            onCellClear={handleCellClear}
            onChordInput={chord => editor.handleChordInput(chord, editor.selection)}
            onUndo={editor.undo}
            onRedo={editor.redo}
            onOpenHelp={() => setShortcutsOpen(true)}
          />
        )}

        {/* ── Practice workspace: reading and playback live in one route ──── */}
        {!isImported && route.name === 'practice' && (
          <div className="flex-1 overflow-y-auto bg-[#f6f6f3] dark:bg-zinc-950 transition-colors duration-250">
            <SongPreview
              sections={editor.sections}
              customChords={editor.customChords}
              globalChords={editor.globalChords}
              externalTranspose={editor.transposeOffset}
              onTransposeChange={editor.setTransposeOffset}
              theme={theme}
              playState={playback.playState}
              isPlaying={playback.isPlaying}
              isPaused={playback.isPaused}
              onTogglePlayPause={playback.togglePlayPause}
            />
          </div>
        )}

      </main>

      {(route.name === 'create' || route.name === 'practice') && (
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
