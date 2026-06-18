
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Music, Plus, Save, Download, Settings, Play, ChevronRight, Hash, LayoutGrid, Info, Eye, Edit3, Book, Undo2, Redo2, Anchor, CheckCircle2, ChevronUp, ChevronDown, RotateCcw, ArrowLeft, Search, Clock, FileText, Sun, Moon } from 'lucide-react';
import TabMeasure from './components/TabMeasure';
import ChordDiagram from './components/ChordDiagram';
import SongPreview from './components/SongPreview';
import ChordManager from './components/ChordManager';
import Home from './components/Home';
import { EMPTY_MEASURE, COMMON_CHORDS } from './constants';
import { TabSection, ChordDefinition, GuitarSong } from './types';
import { api } from './services/api';
import { exportToMidi } from './services/midiHelper';



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

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const [songs, setSongs] = useState<GuitarSong[]>([]);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  
  // Current editing song states
  const [songTitle, setSongTitle] = useState('My Awesome Riff');
  const [sections, setSections] = useState<TabSection[]>([]);
  const [customChords, setCustomChords] = useState<ChordDefinition[]>([]);
  const [transposeOffset, setTransposeOffset] = useState(0);
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const [selection, setSelection] = useState<{ sectionId: string; measureIdx: number; stringIdx: number; colIdx: number } | null>(null);
  const [previewChord, setPreviewChord] = useState<ChordDefinition | null>(null);

  const [history, setHistory] = useState<TabSection[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const chordLibrary = useMemo(() => [...COMMON_CHORDS, ...customChords], [customChords]);

  // Load song list from Django backend on mount
  useEffect(() => {
    api.fetchSongs()
      .then(loadedSongs => {
        setSongs(loadedSongs);
      })
      .catch(e => {
        console.error("Failed to load songs from backend", e);
      });
  }, []);

  const createNewSong = () => {
    const initialSection: Omit<TabSection, 'id'> = { 
      title: 'Intro', 
      capo: 0,
      measures: [JSON.parse(JSON.stringify(EMPTY_MEASURE))],
      chords: [Array(16).fill(null)],
      lyrics: [Array(16).fill(null)]
    };
    
    const newSongData: Omit<GuitarSong, 'id' | 'lastModified'> = {
      title: 'New Song',
      sections: [initialSection as TabSection],
      customChords: [],
      transposeOffset: 0
    };

    api.createSong(newSongData as Omit<GuitarSong, 'id'>)
      .then(newSong => {
        setSongs([newSong, ...songs]);
        openSong(newSong);
      })
      .catch(e => {
        console.error("Failed to create song on backend", e);
      });
  };

  const openSong = (song: GuitarSong) => {
    setCurrentSongId(song.id);
    setSongTitle(song.title);
    setSections(song.sections);
    setCustomChords(song.customChords || []);
    setTransposeOffset(song.transposeOffset || 0);
    setActiveSectionId(song.sections[0]?.id || '');
    setHistory([song.sections]);
    setHistoryIndex(0);
    setViewMode('edit');
  };

  const deleteSong = (id: string) => {
    api.deleteSong(id)
      .then(() => {
        setSongs(songs.filter(s => s.id !== id));
      })
      .catch(e => {
        console.error("Failed to delete song on backend", e);
      });
  };

  const saveCurrentSong = () => {
    if (!currentSongId) return;
    setSaveStatus('saving');
    
    const updatedSongData: Omit<GuitarSong, 'id' | 'lastModified'> = {
      title: songTitle,
      sections,
      customChords,
      transposeOffset
    };

    api.updateSong(currentSongId, updatedSongData as Omit<GuitarSong, 'id'>)
      .then(savedSong => {
        setSongs(songs.map(s => s.id === currentSongId ? savedSong : s));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      })
      .catch(e => {
        console.error("Failed to save song on backend", e);
        setSaveStatus('idle');
      });
  };

  const exportAsFile = () => {
    const songData = {
      title: songTitle,
      sections: sections,
      customChords: customChords,
      transposeOffset: transposeOffset
    };
    const blob = new Blob([JSON.stringify(songData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${songTitle.replace(/\s+/g, '_')}.gflow`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const triggerMidiExport = () => {
    exportToMidi(songTitle, sections, transposeOffset);
  };

  const triggerPdfExport = () => {
    const originalView = viewMode;
    if (originalView !== 'preview') {
      setViewMode('preview');
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          setViewMode(originalView);
        }, 1000);
      }, 300);
    } else {
      window.print();
    }
  };


  const commitToHistory = (newSections: TabSection[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(JSON.parse(JSON.stringify(newSections)));
    if (nextHistory.length > 50) nextHistory.shift();
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setSections(newSections);
  };

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setSections(JSON.parse(JSON.stringify(history[nextIndex])));
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setSections(JSON.parse(JSON.stringify(history[nextIndex])));
    }
  }, [history, historyIndex]);

  const updateLyric = (sectionId: string, mIdx: number, cIdx: number, text: string) => {
    const nextSections = sections.map(sec => {
      if (sec.id === sectionId) {
        const newLyrics = [...sec.lyrics];
        newLyrics[mIdx] = [...newLyrics[mIdx]];
        newLyrics[mIdx][cIdx] = text || null;
        return { ...sec, lyrics: newLyrics };
      }
      return sec;
    });
    commitToHistory(nextSections);
  };

  const setCapo = (sectionId: string, fret: number) => {
    const nextSections = sections.map(sec => {
      if (sec.id === sectionId) {
        return { ...sec, capo: fret };
      }
      return sec;
    });
    commitToHistory(nextSections);
  };

  const addMeasure = (sectionId: string) => {
    const nextSections = sections.map(sec => {
      if (sec.id === sectionId) {
        return { 
          ...sec, 
          measures: [...sec.measures, JSON.parse(JSON.stringify(EMPTY_MEASURE))],
          chords: [...sec.chords, Array(16).fill(null)],
          lyrics: [...sec.lyrics, Array(16).fill(null)]
        };
      }
      return sec;
    });
    commitToHistory(nextSections);
  };

  const deleteMeasure = (sectionId: string, mIdx: number) => {
    const nextSections = sections.map(sec => {
      if (sec.id === sectionId) {
        if (sec.measures.length <= 1) return sec;
        const newMeasures = [...sec.measures];
        const newChords = [...sec.chords];
        const newLyrics = [...sec.lyrics];
        newMeasures.splice(mIdx, 1);
        newChords.splice(mIdx, 1);
        newLyrics.splice(mIdx, 1);
        return { ...sec, measures: newMeasures, chords: newChords, lyrics: newLyrics };
      }
      return sec;
    });
    commitToHistory(nextSections);
    setSelection(null);
  };

  const copyMeasure = (sectionId: string, mIdx: number) => {
    const nextSections = sections.map(sec => {
      if (sec.id === sectionId) {
        const newMeasures = [...sec.measures];
        const newChords = [...sec.chords];
        const newLyrics = [...sec.lyrics];
        
        newMeasures.splice(mIdx + 1, 0, JSON.parse(JSON.stringify(newMeasures[mIdx])));
        newChords.splice(mIdx + 1, 0, [...newChords[mIdx]]);
        newLyrics.splice(mIdx + 1, 0, [...newLyrics[mIdx]]);
        return { ...sec, measures: newMeasures, chords: newChords, lyrics: newLyrics };
      }
      return sec;
    });
    commitToHistory(nextSections);
  };

  const clearColumn = (sectionId: string, mIdx: number, cIdx: number) => {
    const nextSections = sections.map(sec => {
      if (sec.id === sectionId) {
        const newMeasures = [...sec.measures];
        const newChords = [...sec.chords];
        const newLyrics = [...sec.lyrics];
        for (let s = 0; s < 6; s++) {
          newMeasures[mIdx][s][cIdx] = '-';
        }
        newChords[mIdx][cIdx] = null;
        newLyrics[mIdx][cIdx] = null;
        return { ...sec, measures: newMeasures, chords: newChords, lyrics: newLyrics };
      }
      return sec;
    });
    commitToHistory(nextSections);
  };

  const addSection = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const nextSections = [...sections, { 
      id: newId, 
      title: 'New Section', 
      capo: 0,
      measures: [JSON.parse(JSON.stringify(EMPTY_MEASURE))],
      chords: [Array(16).fill(null)],
      lyrics: [Array(16).fill(null)]
    }];
    commitToHistory(nextSections);
    setActiveSectionId(newId);
  };

  const applyChordToColumn = (sectionId: string, mIdx: number, cIdx: number, chord: ChordDefinition) => {
    const nextSections = sections.map(sec => {
      if (sec.id === sectionId) {
        const newMeasures = [...sec.measures];
        const newChords = [...sec.chords];
        chord.frets.forEach((fret, sIdx) => {
          newMeasures[mIdx][sIdx][cIdx] = fret === null ? '-' : fret.toString();
        });
        newChords[mIdx][cIdx] = chord.name;
        return { ...sec, measures: newMeasures, chords: newChords };
      }
      return sec;
    });
    commitToHistory(nextSections);
  };

  const handleChordNameChange = (sectionId: string, mIdx: number, cIdx: number, name: string) => {
    const nextSections = sections.map(sec => {
      if (sec.id === sectionId) {
        const newChords = [...sec.chords];
        newChords[mIdx] = [...newChords[mIdx]];
        newChords[mIdx][cIdx] = name || null;

        const foundChord = chordLibrary.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (foundChord) {
          const newMeasures = [...sec.measures];
          newMeasures[mIdx] = [...newMeasures[mIdx]];
          foundChord.frets.forEach((fret, sIdx) => {
            newMeasures[mIdx][sIdx] = [...newMeasures[mIdx][sIdx]];
            newMeasures[mIdx][sIdx][cIdx] = fret === null ? '-' : fret.toString();
          });
          return { ...sec, chords: newChords, measures: newMeasures };
        }
        
        return { ...sec, chords: newChords };
      }
      return sec;
    });
    commitToHistory(nextSections);
  };

  const handleDropChord = (sectionId: string, mIdx: number, cIdx: number, chordName: string) => {
    const chord = chordLibrary.find(c => c.name === chordName);
    if (chord) {
      applyChordToColumn(sectionId, mIdx, cIdx, chord);
    }
  };

  const handleChordInput = (chord: ChordDefinition) => {
    if (!selection) return;
    applyChordToColumn(selection.sectionId, selection.measureIdx, selection.colIdx, chord);
    setPreviewChord(chord);
    setSelection(prev => {
      if (!prev) return null;
      const nextCol = prev.colIdx + 1;
      if (nextCol < 16) return { ...prev, colIdx: nextCol };
      return prev;
    });
  };

  // Helper to safely navigate grid
  const moveCursor = useCallback((direction: 'up' | 'down' | 'left' | 'right' | 'nextMeasure' | 'nextBeat') => {
    if (!selection) return;

    const currentSection = sections.find(s => s.id === selection.sectionId);
    if (!currentSection) return;

    let { measureIdx, stringIdx, colIdx } = selection;
    const maxMeasureIdx = currentSection.measures.length - 1;
    const maxColIdx = 15; // 16 columns (0-15)

    switch (direction) {
      case 'up':
        stringIdx = Math.max(0, stringIdx - 1);
        break;
      case 'down':
        stringIdx = Math.min(5, stringIdx + 1);
        break;
      case 'left':
        if (colIdx > 0) {
          colIdx--;
        } else if (measureIdx > 0) {
          measureIdx--;
          colIdx = maxColIdx;
        }
        break;
      case 'right':
      case 'nextBeat': // Tab behavior (next slot for fluidity)
        if (colIdx < maxColIdx) {
          colIdx++;
        } else if (measureIdx < maxMeasureIdx) {
          measureIdx++;
          colIdx = 0;
        }
        break;
      case 'nextMeasure': // Enter behavior
        if (measureIdx < maxMeasureIdx) {
          measureIdx++;
          colIdx = 0;
        }
        break;
    }

    setSelection({ ...selection, measureIdx, stringIdx, colIdx });
  }, [selection, sections]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (viewMode === 'home') return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); return; }
    
    // Allow input in text fields
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

    // Handle Selection Navigation
    if (selection) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveCursor('up');
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveCursor('down');
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        moveCursor('left');
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        moveCursor('right');
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        moveCursor('nextBeat');
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        moveCursor('nextMeasure');
        return;
      }
    }

    // Handle Input logic if selection exists
    if (!selection) return;

    const isNum = e.key >= '0' && e.key <= '9';
    const isSlide = e.key.toLowerCase() === 's' || e.key === '/';

    if (isNum || isSlide) {
      const nextSections = sections.map(sec => {
        if (sec.id === selection.sectionId) {
          const newMeasures = [...sec.measures];
          const currentVal = newMeasures[selection.measureIdx][selection.stringIdx][selection.colIdx];
          
          if (isSlide) {
            // Append slide suffix if not present
            if (currentVal !== '-' && currentVal !== '·' && !isNaN(parseInt(currentVal, 10)) && !currentVal.includes('s') && !currentVal.includes('/')) {
              newMeasures[selection.measureIdx][selection.stringIdx][selection.colIdx] = currentVal + e.key.toLowerCase();
              // Don't advance cursor on slide entry so user can see it
            } else {
              // If empty, just start with symbol (uncommon but handled)
              newMeasures[selection.measureIdx][selection.stringIdx][selection.colIdx] = e.key.toLowerCase();
            }
          } else {
            // Numeric Input Logic (Smart Entry 0-24)
            let newVal = e.key;

            // Smart double digit handling
            // If current cell is a single digit number, and we type another digit, try to combine
            if (currentVal !== '-' && currentVal !== '·' && /^\d+$/.test(currentVal)) {
               const combined = parseInt(currentVal + e.key, 10);
               if (combined <= 24 && currentVal.length < 2) {
                 newVal = combined.toString();
               }
            }
            
            newMeasures[selection.measureIdx][selection.stringIdx][selection.colIdx] = newVal;
          }
          return { ...sec, measures: newMeasures };
        }
        return sec;
      });
      commitToHistory(nextSections);
      
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      const nextSections = sections.map(sec => {
        if (sec.id === selection.sectionId) {
          const newMeasures = [...sec.measures];
          newMeasures[selection.measureIdx][selection.stringIdx][selection.colIdx] = '-';
          return { ...sec, measures: newMeasures };
        }
        return sec;
      });
      commitToHistory(nextSections);
    } 
  }, [selection, sections, viewMode, undo, redo, moveCursor]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const currentSection = sections.find(s => s.id === activeSectionId);
  
  const getActiveChord = () => {
    if (previewChord) return previewChord;
    if (selection && currentSection) {
      const { measureIdx, colIdx } = selection;
      const chordName = currentSection.chords[measureIdx][colIdx];
      if (chordName) {
        const namedChord = chordLibrary.find(c => c.name === chordName);
        if (namedChord) return namedChord;
      }
      const columnNotes = currentSection.measures[measureIdx].map(str => str[colIdx]);
      const hasNotes = columnNotes.some(n => n !== '-' && n !== '·');
      if (hasNotes) {
        const frets = columnNotes.map(n => {
          if (n === '-' || n === '·') return null;
          // Extract numeric part for chord detection
          const match = n.match(/^(\d+)/);
          const parsed = match ? parseInt(match[1], 10) : null;
          return parsed;
        });
        return { name: 'Custom', frets: frets } as ChordDefinition;
      }
    }
    return null;
  };

  const activeChord = getActiveChord();

  if (viewMode === 'home') {
    return (
      <Home 
        songs={songs} 
        onCreateNew={createNewSong} 
        onOpen={openSong} 
        onDelete={deleteSong} 
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 selection:bg-indigo-500/20 dark:selection:bg-violet-500/30 selection:text-indigo-900 dark:selection:text-violet-200 transition-colors duration-200">
      <header className="bg-white dark:bg-zinc-900/50 backdrop-blur-xl border-b border-slate-200 dark:border-zinc-800/80 px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm dark:shadow-md transition-colors duration-200">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewMode('home')}
            className="p-2 text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded-xl transition-all"
            title="Back to Home"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 dark:from-violet-600 dark:to-fuchsia-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/10 dark:shadow-violet-500/25">
            <Music size={24} />
          </div>
          <input 
            value={songTitle}
            onChange={e => setSongTitle(e.target.value)}
            className="text-xl font-bold text-slate-850 dark:text-zinc-100 bg-transparent border-none outline-none focus:ring-0 focus:border-b focus:border-indigo-500/50 dark:focus:border-violet-500/50 w-64 md:w-auto"
          />
        </div>
        
        <nav className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-950 border border-slate-250/50 dark:border-zinc-850 p-1 rounded-xl mx-4 transition-colors">
          <button onClick={() => setViewMode('edit')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'edit' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-violet-400 border border-slate-250/30 dark:border-zinc-800 shadow-sm' : 'text-slate-500 dark:text-zinc-500 hover:text-slate-850 dark:hover:text-zinc-300'}`}>
            <Edit3 size={16} /> Edit
          </button>
          <button onClick={() => setViewMode('preview')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'preview' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-violet-400 border border-slate-250/30 dark:border-zinc-800 shadow-sm' : 'text-slate-500 dark:text-zinc-500 hover:text-slate-850 dark:hover:text-zinc-300'}`}>
            <Eye size={16} /> Preview
          </button>
          <button onClick={() => setViewMode('library')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'library' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-violet-400 border border-slate-250/30 dark:border-zinc-800 shadow-sm' : 'text-slate-500 dark:text-zinc-500 hover:text-slate-850 dark:hover:text-zinc-300'}`}>
            <Book size={16} /> Chords
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900/50 p-1 rounded-xl border border-slate-200 dark:border-zinc-850 transition-colors">
            <button onClick={undo} disabled={historyIndex === 0} className="p-2 text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 transition-all rounded-lg" title="Undo (Ctrl+Z)">
              <Undo2 size={18} />
            </button>
            <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-2 text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 transition-all rounded-lg" title="Redo (Ctrl+Y)">
              <Redo2 size={18} />
            </button>
          </div>

          <button 
            onClick={toggleTheme}
            className="p-2 text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-850 hover:bg-slate-200/50 dark:hover:bg-zinc-800 rounded-xl transition-all shadow-sm"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button 
            onClick={saveCurrentSong} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
              saveStatus === 'saved' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-850 text-slate-700 dark:text-zinc-300 hover:border-indigo-500 dark:hover:border-violet-500 hover:text-indigo-600 dark:hover:text-violet-400 shadow-sm dark:shadow-md'
            }`}
          >
            {saveStatus === 'saving' ? (
              <div className="w-4 h-4 border-2 border-slate-350 dark:border-zinc-650 border-t-slate-600 dark:border-t-zinc-300 rounded-full animate-spin" />
            ) : saveStatus === 'saved' ? (
              <CheckCircle2 size={18} />
            ) : (
              <Save size={18} />
            )}
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
          </button>

          <div className="relative print:hidden">
            <button 
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-650 to-violet-650 dark:from-violet-600 dark:via-fuchsia-600 dark:to-indigo-600 text-white rounded-xl text-sm font-bold hover:opacity-95 transition-all shadow-lg shadow-indigo-500/15 dark:shadow-violet-500/20"
            >
              <Download size={18} /> Export <ChevronDown size={14} />
            </button>
            
            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <button 
                  onClick={() => { exportAsFile(); setIsExportOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2.5"
                >
                  <FileText size={16} className="text-slate-400 dark:text-zinc-550" /> Export Project (.gflow)
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

      <main className="flex-1 flex overflow-hidden">
        {viewMode === 'edit' && (
          <>
            <aside className="w-64 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-md border-r border-slate-200 dark:border-zinc-800/80 flex flex-col transition-colors duration-250">
              <div className="p-6 border-b border-slate-200 dark:border-zinc-800/80 flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Sections</h3>
                <button onClick={addSection} className="p-1 text-indigo-650 dark:text-violet-400 hover:bg-indigo-50 dark:hover:bg-violet-955/30 rounded-lg transition-colors">
                  <Plus size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {sections.map(sec => (
                  <button 
                    key={sec.id}
                    onClick={() => setActiveSectionId(sec.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all border ${activeSectionId === sec.id ? 'border-indigo-500 bg-indigo-50/70 text-indigo-650 dark:border-violet-500 dark:bg-violet-500/10 dark:text-violet-400 font-bold shadow-md' : 'border-transparent text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-850'}`}
                  >
                    {sec.title}
                  </button>
                ))}
              </div>
            </aside>

            <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-zinc-950 p-8 flex flex-col gap-8 transition-colors duration-250">
              {currentSection && (
                <div className="bg-white/80 dark:bg-zinc-900/20 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800/60 p-8 shadow-md dark:shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-6">
                      <input 
                        value={currentSection.title}
                        onChange={e => {
                          const next = sections.map(s => s.id === activeSectionId ? {...s, title: e.target.value} : s);
                          setSections(next);
                        }}
                        className="text-2xl font-bold text-slate-805 dark:text-zinc-100 border-b-2 border-transparent focus:border-indigo-500 dark:focus:border-violet-500 outline-none bg-transparent transition-all"
                      />
                      <div className="h-8 w-[1px] bg-slate-200 dark:bg-zinc-800" />
                      <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 group transition-colors">
                        <Anchor size={14} className="text-slate-400 dark:text-zinc-500 group-hover:text-indigo-650 dark:group-hover:text-violet-400 transition-colors" />
                        <span className="text-[10px] font-bold text-slate-450 dark:text-zinc-555 uppercase tracking-widest">Capo</span>
                        <select 
                          value={currentSection.capo}
                          onChange={(e) => setCapo(activeSectionId, parseInt(e.target.value, 10))}
                          className="bg-transparent text-sm font-bold text-slate-650 dark:text-zinc-350 outline-none cursor-pointer"
                        >
                          {Array.from({ length: 13 }).map((_, i) => (
                            <option key={i} value={i} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-355">{i === 0 ? 'None' : i}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button 
                      onClick={() => addMeasure(activeSectionId)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-violet-955/40 text-indigo-600 dark:text-violet-400 border border-indigo-200/50 dark:border-violet-900/30 rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      <Plus size={16} /> Add Measure
                    </button>
                  </div>
                  
                  {/* Measures Grid: Wraps after 2 measures */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-16">
                    {currentSection.measures.map((measure, mIdx) => (
                      <div key={mIdx} className="w-full overflow-x-auto xl:overflow-visible">
                        <TabMeasure 
                          measure={measure}
                          chords={currentSection.chords[mIdx]}
                          lyrics={currentSection.lyrics[mIdx]}
                          activeCol={selection?.measureIdx === mIdx ? selection.colIdx : null}
                          activeString={selection?.measureIdx === mIdx ? selection.stringIdx : null}
                          onCellClick={(sIdx, cIdx) => setSelection({ sectionId: activeSectionId, measureIdx: mIdx, stringIdx: sIdx, colIdx: cIdx })}
                          onChordClick={(cIdx) => setSelection({ sectionId: activeSectionId, measureIdx: mIdx, stringIdx: 0, colIdx: cIdx })}
                          onChordNameChange={(cIdx, name) => handleChordNameChange(activeSectionId, mIdx, cIdx, name)}
                          onLyricChange={(cIdx, text) => updateLyric(activeSectionId, mIdx, cIdx, text)}
                          onDelete={() => deleteMeasure(activeSectionId, mIdx)}
                          onCopy={() => copyMeasure(activeSectionId, mIdx)}
                          onClearColumn={(cIdx) => clearColumn(activeSectionId, mIdx, cIdx)}
                          onDropChord={(cIdx, chordName) => handleDropChord(activeSectionId, mIdx, cIdx, chordName)}
                          canDelete={currentSection.measures.length > 1}
                          theme={theme}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
                  <div className="h-64 bg-slate-100/50 dark:bg-zinc-950/40 rounded-3xl border border-slate-200 dark:border-zinc-850 flex items-center justify-center p-8 text-center shadow-inner">
                    <p className="text-xs font-semibold text-slate-400 dark:text-zinc-650">Select a column or enter notes to see a chord preview</p>
                  </div>
                )}

                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-slate-450 dark:text-zinc-550 uppercase">Chord Library</span>
                  <div className="grid grid-cols-2 gap-2">
                    {chordLibrary.map(chord => (
                      <button 
                        key={chord.name}
                        draggable="true"
                        onDragStart={(e) => {
                          e.dataTransfer.setData('chordName', chord.name);
                        }}
                        onClick={() => handleChordInput(chord)}
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

        {viewMode === 'preview' && (
          <div className="flex-1 p-8 overflow-y-auto bg-slate-100 dark:bg-zinc-950 transition-colors duration-250">
            <SongPreview 
              sections={sections} 
              customChords={customChords} 
              externalTranspose={transposeOffset}
              onTransposeChange={setTransposeOffset}
              theme={theme}
            />
          </div>
        )}

        {viewMode === 'library' && (
          <ChordManager 
            customChords={customChords} 
            onAddChord={(c) => setCustomChords([...customChords, c])}
            onDeleteChord={(name) => setCustomChords(customChords.filter(c => c.name !== name))}
            theme={theme}
          />
        )}
      </main>
    </div>
  );
};

export default App;
