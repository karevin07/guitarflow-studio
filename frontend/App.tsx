
import React, { useState, useCallback, useEffect } from 'react';
import {
  Music, Plus, Save, Download,
  Eye, Edit3, Book, Undo2, Redo2, Anchor, CheckCircle2,
  ChevronDown, ArrowLeft, FileText,
  Sun, Moon,
  Play, Pause, Square, Repeat, Volume2, Activity
} from 'lucide-react';
import TabMeasure from './components/TabMeasure';
import Fretboard from './components/Fretboard';
import ChordDiagram from './components/ChordDiagram';
import SongPreview from './components/SongPreview';
import ChordManager from './components/ChordManager';
import Home from './components/Home';
import { ToastContainer } from './components/Toast';
import { GuitarSong } from './types';
import { exportToMidi } from './services/midiHelper';
import { useEditorState, createEmptyMeasure } from './hooks/useEditorState';
import { useSongLibrary } from './hooks/useSongLibrary';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useToast } from './hooks/useToast';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'home' | 'edit' | 'preview' | 'library'>('home');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('guitarflow-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });
  const [isExportOpen, setIsExportOpen] = useState(false);

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

  // ─── Playback state ────────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [playBpm, setPlayBpm] = useState(120);
  const [playState, setPlayState] = useState<{
    sectionIdx: number;
    measureIdx: number;
    colIdx: number;
  } | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const [playbackVolume, setPlaybackVolume] = useState(0.5);

  // Playback sound & cursor sync via Web Audio API
  useEffect(() => {
    if (!isPlaying) {
      setPlayState(null);
      return;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    let audioCtx: AudioContext | null = null;
    try {
      audioCtx = new AudioContextClass();
    } catch (e) {
      console.error('Web Audio API not supported', e);
    }

    const msPerCol = (60 / playBpm) / 4 * 1000;

    let currentSectionIdx = 0;
    let currentMeasureIdx = 0;
    let currentColIdx = 0;

    setPlayState({
      sectionIdx: currentSectionIdx,
      measureIdx: currentMeasureIdx,
      colIdx: currentColIdx
    });

    const playSoundForCol = (secIdx: number, measIdx: number, cIdx: number) => {
      if (!audioCtx) return;
      const section = editor.sections[secIdx];
      if (!section) return;
      const measure = section.measures[measIdx];
      if (!measure) return;

      // Metronome beat indicator
      if (isMetronomeOn && cIdx % 4 === 0) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(cIdx === 0 ? 1000 : 750, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08 * playbackVolume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.04);
      }

      // Guitar frequencies synth
      const TUNING_PITCHES = [64, 59, 55, 50, 45, 40];
      const capo = section.capo || 0;

      for (let sIdx = 0; sIdx < 6; sIdx++) {
        const noteStr = measure[sIdx][cIdx];
        if (noteStr && noteStr !== '-' && noteStr !== '·' && noteStr.toLowerCase() !== 'x') {
          const match = noteStr.match(/^(\d+)/);
          if (match) {
            const fret = parseInt(match[1], 10);
            const pitch = TUNING_PITCHES[sIdx] + fret + capo + editor.transposeOffset;
            const frequency = 440 * Math.pow(2, (pitch - 69) / 12);

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

            gain.gain.setValueAtTime(0.12 * playbackVolume, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 0.45);
          }
        }
      }
    };

    playSoundForCol(currentSectionIdx, currentMeasureIdx, currentColIdx);

    const intervalId = setInterval(() => {
      currentColIdx++;
      if (currentColIdx >= 16) {
        currentColIdx = 0;
        currentMeasureIdx++;

        const currentSec = editor.sections[currentSectionIdx];
        if (currentSec && currentMeasureIdx >= currentSec.measures.length) {
          currentMeasureIdx = 0;
          currentSectionIdx++;

          if (currentSectionIdx >= editor.sections.length) {
            if (isLooping) {
              currentSectionIdx = 0;
            } else {
              setIsPlaying(false);
              clearInterval(intervalId);
              return;
            }
          }
        }
      }

      setPlayState({
        sectionIdx: currentSectionIdx,
        measureIdx: currentMeasureIdx,
        colIdx: currentColIdx
      });

      playSoundForCol(currentSectionIdx, currentMeasureIdx, currentColIdx);
    }, msPerCol);

    return () => {
      clearInterval(intervalId);
      if (audioCtx) {
        audioCtx.close();
      }
    };
  }, [isPlaying, playBpm, isLooping, isMetronomeOn, playbackVolume, editor.sections, editor.transposeOffset]);

  // ─── Song library ──────────────────────────────────────────────────────────
  const library = useSongLibrary({
    onSongOpened: (title, sections, chords, transpose) => {
      editor.loadSong(title, sections, chords, transpose);
      setViewMode('edit');
    },
    onError: toast.error,
    onSuccess: toast.success,
  });

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
    library.saveCurrentSong({
      title: editor.songTitle,
      sections: editor.sections,
      customChords: editor.customChords,
      transposeOffset: editor.transposeOffset,
    });
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

  // ─── Derived state ─────────────────────────────────────────────────────────
  const currentSection = editor.sections.find(s => s.id === editor.activeSectionId);
  const activeChord = editor.getActiveChord(currentSection);

  // ─── Home view ─────────────────────────────────────────────────────────────
  if (viewMode === 'home') {
    return (
      <>
        <Home
          songs={library.songs}
          onCreateNew={createNewSong}
          onOpen={library.openSong}
          onDelete={library.deleteSong}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </>
    );
  }

  // ─── Editor / Preview / Library view ──────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 selection:bg-indigo-500/20 dark:selection:bg-violet-500/30 selection:text-indigo-900 dark:selection:text-violet-200 transition-colors duration-200">
      {/* ─ Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white dark:bg-zinc-900/50 backdrop-blur-xl border-b border-slate-200 dark:border-zinc-800/80 px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm dark:shadow-md transition-colors duration-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode('home')}
            className="p-2 text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
            title="Back to Home"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 dark:from-violet-600 dark:to-fuchsia-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/10 dark:shadow-violet-500/25">
            <Music size={24} />
          </div>
          <input
            value={editor.songTitle}
            onChange={e => editor.setSongTitle(e.target.value)}
            className="text-xl font-bold text-slate-800 dark:text-zinc-100 bg-transparent border-none outline-none focus:ring-0 focus:border-b focus:border-indigo-500/50 dark:focus:border-violet-500/50 w-64 md:w-auto"
          />
        </div>

        <nav className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 p-1 rounded-xl mx-4 transition-colors">
          {(['edit', 'preview', 'library'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all capitalize ${
                viewMode === mode
                  ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-violet-400 border border-slate-200/30 dark:border-zinc-800 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-300'
              }`}
            >
              {mode === 'edit' && <Edit3 size={16} />}
              {mode === 'preview' && <Eye size={16} />}
              {mode === 'library' && <Book size={16} />}
              {mode === 'library' ? 'Chords' : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {/* Undo / Redo */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900/50 p-1 rounded-xl border border-slate-200 dark:border-zinc-800 transition-colors">
            <button
              onClick={editor.undo}
              disabled={editor.historyIndex === 0}
              className="p-2 text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 transition-all rounded-lg"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={editor.redo}
              disabled={editor.historyIndex === editor.history.length - 1}
              className="p-2 text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 transition-all rounded-lg"
              title="Redo (Ctrl+Y)"
            >
              <Undo2 size={18} className="scale-x-[-1]" />
            </button>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 hover:bg-slate-200/50 dark:hover:bg-zinc-800 rounded-xl transition-all shadow-sm"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Save */}
          <button
            onClick={saveCurrentSong}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
              library.saveStatus === 'saved'
                ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-indigo-500 dark:hover:border-violet-500 hover:text-indigo-600 dark:hover:text-violet-400 shadow-sm dark:shadow-md'
            }`}
          >
            {library.saveStatus === 'saving' ? (
              <div className="w-4 h-4 border-2 border-slate-300 dark:border-zinc-600 border-t-slate-600 dark:border-t-zinc-300 rounded-full animate-spin" />
            ) : library.saveStatus === 'saved' ? (
              <CheckCircle2 size={18} />
            ) : (
              <Save size={18} />
            )}
            {library.saveStatus === 'saving' ? 'Saving…' : library.saveStatus === 'saved' ? 'Saved' : 'Save'}
          </button>

          {/* Export dropdown */}
          <div className="relative print:hidden">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-violet-600 dark:via-fuchsia-600 dark:to-indigo-600 text-white rounded-xl text-sm font-bold hover:opacity-95 transition-all shadow-lg shadow-indigo-500/15 dark:shadow-violet-500/20"
            >
              <Download size={18} /> Export <ChevronDown size={14} />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => { exportAsFile(); setIsExportOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2.5"
                >
                  <FileText size={16} className="text-slate-400 dark:text-zinc-500" /> Export Project (.gflow)
                </button>
                <button
                  onClick={() => { triggerMidiExport(); setIsExportOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2.5"
                >
                  <Music size={16} className="text-indigo-600 dark:text-violet-400" /> Export MIDI (.mid)
                </button>
                <button
                  onClick={() => { triggerPdfExport(); setIsExportOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2.5"
                >
                  <Eye size={16} className="text-emerald-600 dark:text-emerald-400" /> Export PDF Sheet
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─ Main ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden">

        {/* ── Edit view ───────────────────────────────────────────────────── */}
        {viewMode === 'edit' && (
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
                {editor.sections.map(sec => (
                  <button
                    key={sec.id}
                    onClick={() => editor.setActiveSectionId(sec.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
                      editor.activeSectionId === sec.id
                        ? 'border-indigo-500 bg-indigo-50/70 text-indigo-600 dark:border-violet-500 dark:bg-violet-500/10 dark:text-violet-400 shadow-md'
                        : 'border-transparent text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {sec.title}
                  </button>
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
                        onChange={e => {
                          const next = editor.sections.map(s =>
                            s.id === editor.activeSectionId ? { ...s, title: e.target.value } : s
                          );
                          editor.setSections(next);
                        }}
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
                      const isSecPlaying = playState && editor.sections[playState.sectionIdx]?.id === currentSection.id;
                      const isMeasPlaying = isSecPlaying && playState?.measureIdx === mIdx;

                      return (
                        <div key={mIdx} className="w-full overflow-x-auto xl:overflow-visible">
                          <TabMeasure
                            measure={measure}
                            chords={currentSection.chords[mIdx]}
                            lyrics={currentSection.lyrics[mIdx]}
                            activeCol={editor.selection?.measureIdx === mIdx ? editor.selection.colIdx : null}
                            activeString={editor.selection?.measureIdx === mIdx ? editor.selection.stringIdx : null}
                            playCol={isMeasPlaying ? playState.colIdx : null}
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
        {viewMode === 'preview' && (
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

        {/* ── Chord library view ───────────────────────────────────────────── */}
        {viewMode === 'library' && (
          <ChordManager
            customChords={editor.customChords}
            globalChords={editor.globalChords}
            onAddChord={c => editor.setCustomChords([...editor.customChords, c])}
            onDeleteChord={name => editor.setCustomChords(editor.customChords.filter(c => c.name !== name))}
            theme={theme}
          />
        )}
      </main>

      {/* ─ Playback Control Bottom Bar ───────────────────────────────────── */}
      {(viewMode === 'edit' || viewMode === 'preview') && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 px-8 py-4 rounded-2xl shadow-2xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-6 z-50 animate-in slide-in-from-bottom-6 duration-300 w-11/12 max-w-4xl">
          {/* Play/Pause/Stop Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 dark:from-violet-650 dark:to-fuchsia-600 text-white shadow-md shadow-indigo-500/20 hover:opacity-95 active:scale-95 transition-all"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
            {isPlaying && (
              <button
                onClick={() => setIsPlaying(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="Stop"
              >
                <Square size={16} fill="currentColor" />
              </button>
            )}
          </div>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-zinc-800 hidden sm:block flex-shrink-0" />

          {/* BPM Tempo Control */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Tempo</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="40"
                max="240"
                value={playBpm}
                onChange={e => setPlayBpm(Math.max(40, Math.min(240, parseInt(e.target.value, 10) || 120)))}
                className="w-14 px-2 py-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-center text-xs font-bold text-slate-700 dark:text-zinc-300 outline-none"
              />
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">BPM</span>
            </div>
            <input 
              type="range"
              min="40"
              max="240"
              value={playBpm}
              onChange={e => setPlayBpm(parseInt(e.target.value, 10))}
              className="w-20 sm:w-28 accent-indigo-600 dark:accent-violet-500 cursor-pointer h-1 rounded bg-slate-200 dark:bg-zinc-800"
            />
          </div>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-zinc-800 hidden sm:block flex-shrink-0" />

          {/* Controls: Loop & Metronome */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${isLooping ? 'bg-indigo-50 dark:bg-violet-900/40 border-indigo-200 dark:border-violet-800 text-indigo-600 dark:text-violet-400' : 'bg-transparent border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-700'}`}
              title="Loop Score"
            >
              <Repeat size={14} />
              <span className="text-[9px] uppercase tracking-wider hidden sm:inline">Loop</span>
            </button>
            <button
              onClick={() => setIsMetronomeOn(!isMetronomeOn)}
              className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${isMetronomeOn ? 'bg-indigo-50 dark:bg-violet-900/40 border-indigo-200 dark:border-violet-800 text-indigo-600 dark:text-violet-400' : 'bg-transparent border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-700'}`}
              title="Metronome"
            >
              <Activity size={14} />
              <span className="text-[9px] uppercase tracking-wider hidden sm:inline">Metronome</span>
            </button>
          </div>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-zinc-800 hidden sm:block flex-shrink-0" />

          {/* Volume Control */}
          <div className="flex items-center gap-2 flex-grow sm:flex-grow-0 justify-end min-w-[80px]">
            <Volume2 size={14} className="text-slate-400 dark:text-zinc-500 flex-shrink-0" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={playbackVolume}
              onChange={e => setPlaybackVolume(parseFloat(e.target.value))}
              className="w-16 sm:w-24 accent-indigo-600 dark:accent-violet-500 cursor-pointer h-1 rounded bg-slate-200 dark:bg-zinc-800"
            />
          </div>
        </div>
      )}

      {/* ─ Playback Control Bottom Bar ───────────────────────────────────── */}
      {(viewMode === 'edit' || viewMode === 'preview') && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 px-8 py-4 rounded-2xl shadow-2xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-6 z-50 animate-in slide-in-from-bottom-6 duration-300 w-11/12 max-w-4xl">
          {/* Play/Pause/Stop Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 dark:from-violet-650 dark:to-fuchsia-600 text-white shadow-md shadow-indigo-500/20 hover:opacity-95 active:scale-95 transition-all"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
            {isPlaying && (
              <button
                onClick={() => setIsPlaying(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="Stop"
              >
                <Square size={16} fill="currentColor" />
              </button>
            )}
          </div>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-zinc-800 hidden sm:block flex-shrink-0" />

          {/* BPM Tempo Control */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Tempo</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="40"
                max="240"
                value={playBpm}
                onChange={e => setPlayBpm(Math.max(40, Math.min(240, parseInt(e.target.value, 10) || 120)))}
                className="w-14 px-2 py-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-center text-xs font-bold text-slate-700 dark:text-zinc-300 outline-none"
              />
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">BPM</span>
            </div>
            <input 
              type="range"
              min="40"
              max="240"
              value={playBpm}
              onChange={e => setPlayBpm(parseInt(e.target.value, 10))}
              className="w-20 sm:w-28 accent-indigo-600 dark:accent-violet-500 cursor-pointer h-1 rounded bg-slate-200 dark:bg-zinc-800"
            />
          </div>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-zinc-800 hidden sm:block flex-shrink-0" />

          {/* Controls: Loop & Metronome */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${isLooping ? 'bg-indigo-50 dark:bg-violet-900/40 border-indigo-200 dark:border-violet-800 text-indigo-600 dark:text-violet-400' : 'bg-transparent border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-700'}`}
              title="Loop Score"
            >
              <Repeat size={14} />
              <span className="text-[9px] uppercase tracking-wider hidden sm:inline">Loop</span>
            </button>
            <button
              onClick={() => setIsMetronomeOn(!isMetronomeOn)}
              className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${isMetronomeOn ? 'bg-indigo-50 dark:bg-violet-900/40 border-indigo-200 dark:border-violet-800 text-indigo-600 dark:text-violet-400' : 'bg-transparent border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-700'}`}
              title="Metronome"
            >
              <Activity size={14} />
              <span className="text-[9px] uppercase tracking-wider hidden sm:inline">Metronome</span>
            </button>
          </div>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-zinc-800 hidden sm:block flex-shrink-0" />

          {/* Volume Control */}
          <div className="flex items-center gap-2 flex-grow sm:flex-grow-0 justify-end min-w-[80px]">
            <Volume2 size={14} className="text-slate-400 dark:text-zinc-500 flex-shrink-0" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={playbackVolume}
              onChange={e => setPlaybackVolume(parseFloat(e.target.value))}
              className="w-16 sm:w-24 accent-indigo-600 dark:accent-violet-500 cursor-pointer h-1 rounded bg-slate-200 dark:bg-zinc-800"
            />
          </div>
        </div>
      )}

      {/* ─ Toast notifications ─────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
};

export default App;
