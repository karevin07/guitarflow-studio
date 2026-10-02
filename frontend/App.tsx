
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import EditView from './components/EditView';
import SongPreview from './components/SongPreview';
import ArrangeView from './components/ArrangeView';
import Home from './components/Home';
import HomeChordLab from './components/HomeChordLab';
import PlayerBar from './components/PlayerBar';
import ImportedScorePanel from './components/ImportedScorePanel';
import SongShellHeader from './components/SongShellHeader';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import ImportPreviewModal from './components/ImportPreviewModal';
import ChordSheetImportModal from './components/ChordSheetImportModal';
import SongInfoModal from './components/SongInfoModal';
import SetlistModal from './components/SetlistModal';
import DriveImportModal from './components/DriveImportModal';
import SetlistBar from './components/SetlistBar';
import { useSetlists } from './hooks/useSetlists';
import { libraryTags, setlistPosition, setlistSongs } from './services/songInfo';
import { formFromStored, formToStored, playOrder } from './services/songForm';
import AuthModal from './components/AuthModal';
import { ToastContainer } from './components/Toast';
import { GuitarSong, ImportedSong, LibrarySong, Setlist, SongInfo, TabSection, isImportedSong } from './types';
import { exportToMidi } from './services/midiHelper';
import { parseGflowText, readGflowFile } from './services/gflowImport';
import { gflowFileName, serializeGflow } from './services/gflowExport';
import { DRIVE_FOLDER_NAME, DriveError, DriveGflowFile, driveSongKey } from './services/googleDrive';
import { DriveCancelledError, drive, isDriveConfigured, preloadDrive } from './services/googleDriveBrowser';
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
import { DEFAULT_BPM, DEFAULT_TIME_SIGNATURE } from './constants/practice';
import { appPaths, parseAppRoute } from './services/routes';
import { loadSessions, recordPlaybackPosition, recordSongOpened, sortByRecent } from './services/sessionHistory';
import { AppDestination } from './components/AppRail';
import { EditMode, loadEditMode, saveEditMode } from './services/lyricsEditor';

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const route = useMemo(() => parseAppRoute(location.pathname), [location.pathname]);
  const isSongWorkspace = route.name === 'create' || route.name === 'practice' || route.name === 'arrange';
  const viewMode: 'home' | 'edit' | 'preview' = route.name === 'create' ? 'edit' : isSongWorkspace ? 'preview' : 'home';
  const [activeImportedSong, setActiveImportedSong] = useState<ImportedSong | null>(null);
  const [importedTitle, setImportedTitle] = useState('');
  const [gpPreviewFile, setGpPreviewFile] = useState<File | null>(null);
  const [chordSheetOpen, setChordSheetOpen] = useState(false);
  const [infoSong, setInfoSong] = useState<LibrarySong | null>(null);
  // undefined: closed; null: creating a new setlist.
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null | undefined>(undefined);
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
  const lastOpenedSongRef = useRef<string | null>(null);

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

  const order = useMemo(() => playOrder(editor.form, editor.sections), [editor.form, editor.sections]);
  const playback = usePlayback({
    sections: editor.sections,
    transposeOffset: editor.transposeOffset,
    chordLibrary: editor.chordLibrary,
    voicingPlan: editor.voicingPlan,
    order,
  });

  // ─── Song library ──────────────────────────────────────────────────────────
  const library = useSongLibrary({
    onSongOpened: song => {
      editor.loadSong(song.title, song.sections, song.customChords || [], song.transposeOffset || 0, song.voicingPlan || {}, song.bpm ?? null, song.form);
      playback.setPlayBpm(song.bpm ?? DEFAULT_BPM);
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
    if (route.name !== 'create' && route.name !== 'practice' && route.name !== 'arrange') {
      lastOpenedSongRef.current = null;
      return;
    }
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
    if (lastOpenedSongRef.current !== song.id) {
      lastOpenedSongRef.current = song.id;
      recordSongOpened(song.id);
    }

    if (isImportedSong(song)) {
      if (route.name === 'create' || route.name === 'arrange') {
        navigate(appPaths.practice(song.id), { replace: true });
        return;
      }
      if (activeImportedSong?.id !== song.id) imported.openSong(song);
      return;
    }

    if (library.currentSongId !== song.id || activeImportedSong) library.openSong(song);
  }, [activeImportedSong, auth.loading, auth.user, imported, library, libraryReady, librarySongs, navigate, route, toast]);

  // Lead sheets open in the lyrics-and-chords editor; the choice is remembered per song.
  const [editMode, setEditMode] = useState<EditMode>('tab');
  const editModeSongRef = useRef<string | null>(null);
  useEffect(() => {
    const songId = library.currentSongId;
    if (!songId || editModeSongRef.current === songId || editor.sections.length === 0) return;
    editModeSongRef.current = songId;
    setEditMode(loadEditMode(songId, editor.sections));
  }, [library.currentSongId, editor.sections]);
  const changeEditMode = useCallback((mode: EditMode) => {
    setEditMode(mode);
    saveEditMode(library.currentSongId, mode);
    // Tab shortcuts act on the selected cell, so drop it when the grid is hidden.
    if (mode === 'lyrics') editor.setSelection(null);
  }, [editor, library.currentSongId]);

  // Remember where playback stopped so the library can offer to continue from there.
  const lastRecordedMeasureRef = useRef<string | null>(null);
  useEffect(() => {
    const state = playback.playState;
    const songId = library.currentSongId;
    if (!state || !songId || playback.totalCols === 0) return;
    const measureKey = `${songId}:${state.sectionIdx}:${state.measureIdx}`;
    if (lastRecordedMeasureRef.current === measureKey) return;
    lastRecordedMeasureRef.current = measureKey;
    const sectionTitle = editor.sections[state.sectionIdx]?.title ?? '';
    recordPlaybackPosition(songId, sectionTitle, (playback.playIndex / playback.totalCols) * 100);
  }, [playback.playState, playback.playIndex, playback.totalCols, library.currentSongId, editor.sections]);

  const performSave = useCallback(() => {
    library.saveCurrentSong({
      title: editor.songTitle,
      sections: editor.sections,
      customChords: editor.customChords,
      voicingPlan: editor.voicingPlan,
      transposeOffset: editor.transposeOffset,
      bpm: editor.bpm,
      form: formToStored(editor.form, editor.sections),
    });
  }, [library, editor.songTitle, editor.sections, editor.customChords, editor.voicingPlan, editor.transposeOffset, editor.bpm, editor.form]);

  useEffect(() => {
    if (viewMode === 'home' || !library.currentSongId) return;
    if (skipDirtyRef.current) {
      skipDirtyRef.current = false;
      return;
    }
    setIsDirty(true);
  }, [editor.sections, editor.songTitle, editor.customChords, editor.voicingPlan, editor.transposeOffset, editor.bpm, editor.form, viewMode, library.currentSongId]);

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

  // Actions started before /auth/me answers wait for it instead of treating the user as signed out.
  // Signed-out users see the login dialog, and the action (e.g. a picked file) continues after login.
  const pendingAuthActionRef = useRef<(() => void) | null>(null);
  const runWhenSignedIn = useCallback((action: () => void) => {
    if (auth.user) {
      action();
      return;
    }
    pendingAuthActionRef.current = action;
    if (!auth.loading) setAuthOpen(true);
  }, [auth.user, auth.loading]);

  useEffect(() => {
    const action = pendingAuthActionRef.current;
    if (!action || auth.loading) return;
    if (auth.user) {
      pendingAuthActionRef.current = null;
      action();
    } else {
      setAuthOpen(true);
    }
  }, [auth.loading, auth.user]);

  const closeAuthDialog = useCallback(() => {
    pendingAuthActionRef.current = null;
    setAuthOpen(false);
  }, []);

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
  const createNewSong = () => runWhenSignedIn(() => { void createSongNow(); });
  const createSongNow = async () => {
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
      voicingPlan: {},
      transposeOffset: 0,
    });
    if (song) navigate(appPaths.create(song.id));
  };

  // ─── Save ──────────────────────────────────────────────────────────────────
  const saveCurrentSong = () => {
    performSave();
  };

  // ─── Export ────────────────────────────────────────────────────────────────
  const currentLibrarySong = library.songs.find(song => song.id === library.currentSongId);
  const currentGflow = () => serializeGflow({
    title: editor.songTitle,
    artist: currentLibrarySong?.artist,
    originalKey: currentLibrarySong?.originalKey,
    tags: currentLibrarySong?.tags,
    sections: editor.sections,
    customChords: editor.customChords,
    voicingPlan: editor.voicingPlan,
    transposeOffset: editor.transposeOffset,
    bpm: editor.bpm,
    form: editor.form,
  });
  const exportAsFile = () => {
    const blob = new Blob([currentGflow()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = gflowFileName(editor.songTitle);
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

  const handleImportFile = useCallback((file: File) => runWhenSignedIn(async () => {
    const result = await readGflowFile(file);
    if (result.ok === false) {
      toast.error(result.error);
      return;
    }
    const song = await library.importSong(result.data);
    if (song) navigate(appPaths.create(song.id));
  }), [library, navigate, toast, runWhenSignedIn]);

  const [driveBusy, setDriveBusy] = useState(false);
  useEffect(() => {
    // Load Google's scripts early so the sign-in popup opens straight from the click.
    if (auth.user) preloadDrive().catch(() => {});
  }, [auth.user]);
  const reportDriveError = useCallback((error: unknown) => {
    if (error instanceof DriveCancelledError) return;
    toast.error(error instanceof DriveError ? error.message : 'Google Drive 連線失敗，請稍後再試。');
  }, [toast]);

  const uploadToDrive = async () => {
    const songId = library.currentSongId;
    if (!songId || driveBusy) return;
    setDriveBusy(true);
    try {
      const song = { key: driveSongKey(currentLibrarySong ?? { id: songId }), id: songId };
      const result = await drive.uploadGflow(song, gflowFileName(editor.songTitle), currentGflow());
      toast.success(result.updated
        ? `已更新 Google Drive 上的「${result.name}」`
        : `已上傳「${result.name}」到 Google Drive 的 ${DRIVE_FOLDER_NAME} 資料夾`);
    } catch (error) {
      reportDriveError(error);
    } finally {
      setDriveBusy(false);
    }
  };

  // null when no backup is running.
  const [backupProgress, setBackupProgress] = useState<{ done: number; total: number } | null>(null);
  const backupLibraryToDrive = async () => {
    if (backupProgress) return;
    const songs = library.songs;
    if (songs.length === 0) {
      toast.info('曲庫裡還沒有可以備份的樂譜。');
      return;
    }
    setBackupProgress({ done: 0, total: songs.length });
    try {
      const result = await drive.backupLibrary(songs.map(song => ({
        song: { key: driveSongKey(song), id: song.id },
        fileName: gflowFileName(song.title),
        lastModified: song.lastModified,
        content: () => serializeGflow({ ...song, bpm: song.bpm ?? null, form: formFromStored(song.form, song.sections) }),
      })), (done, total) => setBackupProgress({ done, total }));
      const counts = [
        result.created > 0 && `新增 ${result.created} 首`,
        result.updated > 0 && `更新 ${result.updated} 首`,
        result.unchanged > 0 && `${result.unchanged} 首沒有變更`,
      ].filter(Boolean).join('、');
      if (result.failed.length > 0) toast.error(`有 ${result.failed.length} 首備份失敗：${result.failed.join('、')}`);
      toast.success(`已備份到 Google Drive 的 ${DRIVE_FOLDER_NAME} 資料夾：${counts}`);
    } catch (error) {
      reportDriveError(error);
    } finally {
      setBackupProgress(null);
    }
  };

  // undefined: closed; null: loading the list.
  const [driveFiles, setDriveFiles] = useState<DriveGflowFile[] | null | undefined>(undefined);
  // Bumped on close, so a list arriving after the dialog was closed does not reopen it.
  const driveListRequestRef = useRef(0);
  const openDriveImport = async () => {
    const request = ++driveListRequestRef.current;
    setDriveFiles(null);
    try {
      // Called straight from the click, so a Google sign-in popup is not blocked.
      const files = await drive.listGflowFiles();
      if (request === driveListRequestRef.current) setDriveFiles(files);
    } catch (error) {
      if (request === driveListRequestRef.current) setDriveFiles(undefined);
      reportDriveError(error);
    }
  };
  const closeDriveImport = () => {
    driveListRequestRef.current += 1;
    setDriveFiles(undefined);
  };

  const importDriveFiles = async (files: DriveGflowFile[]) => {
    setDriveBusy(true);
    try {
      let lastSong: GuitarSong | null = null;
      for (const file of files) {
        const result = parseGflowText(await drive.downloadText(file.id));
        if (result.ok === false) {
          toast.error(`無法匯入「${file.name}」：${result.error}`);
          continue;
        }
        const song = await library.importSong(result.data);
        if (!song) continue;
        lastSong = song;
        // Later backups of the new song overwrite this file instead of adding a copy.
        await drive.linkFile(file.id, { key: driveSongKey(song), id: song.id }).catch(() => {});
      }
      setDriveFiles(undefined);
      if (files.length === 1 && lastSong) navigate(appPaths.create(lastSong.id));
    } catch (error) {
      reportDriveError(error);
    } finally {
      setDriveBusy(false);
    }
  };

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

  // ─── Song info, favourites and setlists ────────────────────────────────────
  const setlists = useSetlists(Boolean(auth.user), toast.error);
  const activeSetlistId = new URLSearchParams(location.search).get('setlist');
  const activeSetlist = setlists.setlists.find(item => item.id === activeSetlistId) ?? null;

  const applySongInfo = useCallback((id: string, info: Partial<LibrarySong>) => {
    library.setSongs(prev => prev.map(song => (song.id === id ? { ...song, ...info } as GuitarSong : song)));
    imported.setSongs(prev => prev.map(song => (song.id === id ? { ...song, ...info } as ImportedSong : song)));
  }, [imported, library]);

  const saveSongInfo = useCallback(async (song: LibrarySong, info: SongInfo & { title?: string }) => {
    try {
      const saved = await songApi.updateSongInfo(song.id, info);
      applySongInfo(song.id, saved);
      // Keep the open copy's title in step so its next autosave does not rename the song back.
      if (library.currentSongId === song.id && saved.title !== editor.songTitle) editor.setSongTitle(saved.title);
      if (activeImportedSong?.id === song.id) setActiveImportedSong(prev => (prev ? { ...prev, ...saved } : prev));
      return true;
    } catch {
      toast.error('儲存歌曲資訊失敗，請稍後再試。');
      return false;
    }
  }, [activeImportedSong?.id, applySongInfo, editor, library.currentSongId, toast]);

  const toggleFavorite = useCallback(async (song: LibrarySong) => {
    const favorite = !song.favorite;
    applySongInfo(song.id, { favorite });
    try {
      await songApi.updateSongInfo(song.id, { favorite });
    } catch {
      applySongInfo(song.id, { favorite: !favorite });
      toast.error('收藏失敗，請稍後再試。');
    }
  }, [applySongInfo, toast]);

  const openInSetlist = useCallback((song: LibrarySong, setlistId: string) => {
    if (isImportedSong(song)) imported.openSong(song);
    else library.openSong(song);
    navigate(`${appPaths.practice(song.id)}?setlist=${encodeURIComponent(setlistId)}`);
  }, [imported, library, navigate]);

  const handleImportedTitleChange = useCallback(async (title: string) => {
    if (!activeImportedSong) return;
    const trimmed = title.trim() || activeImportedSong.title;
    setImportedTitle(trimmed);
    await imported.updateTitle(activeImportedSong.id, trimmed);
    setActiveImportedSong(prev => (prev ? { ...prev, title: trimmed, lastModified: Date.now() } : prev));
    imported.refresh();
  }, [activeImportedSong, imported]);

  const handleInsertSolo = useCallback((afterSectionId: string, section: Omit<TabSection, 'id'>) => {
    editor.insertSectionAfter(afterSectionId, section);
    toast.success(`已加入「${section.title}」`);
  }, [editor, toast]);

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
  // Rail buttons for a workspace open the song you used last in that workspace.
  const openRailDestination = (destination: AppDestination) => {
    if (destination === 'library') return navigate(appPaths.songs);
    if (destination === 'chords') return navigate(appPaths.chords());
    const song = sortByRecent(librarySongs, loadSessions())[0];
    if (!song) {
      if (destination === 'create' && auth.user) void createNewSong();
      else navigate(appPaths.songs);
      return;
    }
    navigate(isImportedSong(song) ? appPaths.practice(song.id) : appPaths[destination](song.id));
  };

  if (viewMode === 'home' || (isSongWorkspace && !auth.user)) {
    if (route.name === 'chords') {
      return (
        <HomeChordLab
          globalChords={editor.globalChords}
          theme={theme}
          onBack={() => navigate(appPaths.songs)}
          onRailNavigate={openRailDestination}
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
          onImportFromDrive={isDriveConfigured() ? () => void openDriveImport() : undefined}
          onBackupToDrive={isDriveConfigured() ? () => void backupLibraryToDrive() : undefined}
          driveBusy={driveFiles !== undefined || backupProgress !== null}
          backupProgress={backupProgress}
          onImportGp={file => runWhenSignedIn(() => setGpPreviewFile(file))}
          onPasteChordSheet={() => runWhenSignedIn(() => setChordSheetOpen(true))}
          setlists={setlists.setlists}
          onEditSetlist={setlist => setEditingSetlist(setlist)}
          onPlaySetlist={setlist => {
            const first = setlistSongs(setlist, librarySongs)[0];
            if (first) openInSetlist(first, setlist.id);
          }}
          onToggleFavorite={toggleFavorite}
          onEditInfo={song => setInfoSong(song)}
          onClaimSong={handleClaimSong}
          onClaimAllLegacy={handleClaimAllLegacy}
          onRailNavigate={openRailDestination}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        {driveFiles !== undefined && (
          <DriveImportModal
            files={driveFiles}
            libraryKeys={new Set(library.songs.map(driveSongKey))}
            importing={driveBusy}
            onImport={files => void importDriveFiles(files)}
            onClose={closeDriveImport}
          />
        )}
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onCancel={closeAuthDialog}
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
        {infoSong && (
          <SongInfoModal
            song={infoSong}
            knownTags={libraryTags(librarySongs)}
            onSave={info => saveSongInfo(infoSong, info)}
            onClose={() => setInfoSong(null)}
          />
        )}
        {editingSetlist !== undefined && (
          <SetlistModal
            setlist={editingSetlist}
            songs={librarySongs}
            onSave={async changes => Boolean(await setlists.save(editingSetlist?.id ?? null, changes))}
            onDelete={async () => (editingSetlist ? setlists.remove(editingSetlist.id) : false)}
            onClose={() => setEditingSetlist(undefined)}
          />
        )}
        {chordSheetOpen && (
          <ChordSheetImportModal
            onClose={() => setChordSheetOpen(false)}
            onCreate={async data => {
              const song = await library.importSong(data);
              if (!song) return;
              setChordSheetOpen(false);
              navigate(appPaths.create(song.id));
            }}
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
        viewMode={route.name === 'create' || route.name === 'arrange' ? route.name : 'practice'}
        onViewModeChange={mode => {
          if (route.name !== 'create' && route.name !== 'practice' && route.name !== 'arrange') return;
          navigate(`${appPaths[mode](route.songId)}${location.search}`);
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
        onUploadToDrive={isDriveConfigured() && library.currentSongId ? () => { void uploadToDrive(); setIsExportOpen(false); } : undefined}
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

      {activeSetlist && 'songId' in route && (() => {
        const position = setlistPosition(activeSetlist, librarySongs, route.songId);
        return position && (
          <SetlistBar
            name={activeSetlist.name}
            position={position}
            onGo={song => { playback.stop(); alphaPlayback.onStop(); openInSetlist(song, activeSetlist.id); }}
            onClose={() => navigate(location.pathname, { replace: true })}
          />
        );
      })()}

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
            onConfirmChordName={(mIdx, cIdx, name) =>
              editor.confirmDetectedChordName(editor.activeSectionId, mIdx, cIdx, name)
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
            editMode={editMode}
            onEditModeChange={changeEditMode}
            onSetChordName={(mIdx, cIdx, name) => editor.setChordName(editor.activeSectionId, mIdx, cIdx, name)}
          />
        )}

        {/* ── Practice workspace: reading and playback live in one route ──── */}
        {!isImported && route.name === 'practice' && (
          <div className="flex-1 overflow-y-auto bg-[#f6f6f3] dark:bg-zinc-950 transition-colors duration-250">
            <SongPreview
              sections={editor.sections}
              songId={library.currentSongId}
              onLoopSection={playback.loopSection}
              onSectionPatternChange={editor.setSectionPattern}
              form={editor.form}
              onFormChange={editor.setForm}
              onJumpToStep={playback.seekStep}
              songOriginalKey={currentLibrarySong?.originalKey}
              melodyRange={currentLibrarySong?.melodyRange ?? null}
              onSaveMelodyRange={range => { if (currentLibrarySong) void saveSongInfo(currentLibrarySong, { melodyRange: range }); }}
              onApplyKey={(transpose, capo, assumedOriginalKey) => {
                editor.setTransposeOffset(transpose);
                editor.setCapo(null, capo);
                if (assumedOriginalKey && currentLibrarySong) void saveSongInfo(currentLibrarySong, { originalKey: assumedOriginalKey });
                toast.success(capo === 0 ? '已改調，不用夾 Capo' : `已改調，Capo 夾第 ${capo} 格`);
              }}
              loopedSectionIdx={playback.loopedSectionIdx}
              customChords={editor.customChords}
              globalChords={editor.globalChords}
              voicingPlan={editor.voicingPlan}
              onVoicingPlanChange={editor.setVoicingPlan}
              externalTranspose={editor.transposeOffset}
              onTransposeChange={editor.setTransposeOffset}
              theme={theme}
              playState={playback.playState}
            />
          </div>
        )}

        {/* ── Arrange workspace: solo note suggestions over the progression ── */}
        {!isImported && route.name === 'arrange' && (
          <div className="flex-1 overflow-y-auto bg-[#f6f6f3] dark:bg-zinc-950 transition-colors duration-250">
            <ArrangeView
              sections={editor.sections}
              transposeOffset={editor.transposeOffset}
              playState={playback.playState}
              chordLibrary={editor.chordLibrary}
              voicingPlan={editor.voicingPlan}
              theme={theme}
              onInsertSolo={handleInsertSolo}
              onOpenCreate={() => navigate(appPaths.create(route.songId))}
            />
          </div>
        )}

      </main>

      {isSongWorkspace && (
        isImported ? (
          <PlayerBar {...alphaPlayback} />
        ) : (
        <PlayerBar
          mode="gflow"
          isPlaying={playback.isPlaying || playback.isCountingIn}
          isPaused={playback.isPaused}
          countInBeat={playback.countInBeat}
          countInBars={playback.countInBars}
          onCountInBarsChange={playback.setCountInBars}
          tempoTrainer={playback.tempoTrainer}
          onTempoTrainerChange={playback.setTempoTrainer}
          onTogglePlayPause={() => {
            if (!playback.isPlaying && !playback.isCountingIn && (selectionPosition || playback.isPaused)) {
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
          onBpmChange={bpm => {
            playback.setPlayBpm(bpm);
            editor.setBpm(bpm);
          }}
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
