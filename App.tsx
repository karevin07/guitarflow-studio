
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Music, Plus, Save, Download, Trash2, Settings, Play, ChevronRight, Hash, LayoutGrid, Info, Eye, Edit3, Book, Undo2, Redo2, Anchor, CheckCircle2, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import TabMeasure from './components/TabMeasure';
import ChordDiagram from './components/ChordDiagram';
import SongPreview from './components/SongPreview';
import ChordManager from './components/ChordManager';
import { EMPTY_MEASURE, COMMON_CHORDS } from './constants';
import { TabSection, ChordDefinition } from './types';

const App: React.FC = () => {
  const [songTitle, setSongTitle] = useState('My Awesome Riff');
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'library'>('edit');
  const [customChords, setCustomChords] = useState<ChordDefinition[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [transposeOffset, setTransposeOffset] = useState(0);
  
  const initialSection: TabSection = { 
    id: '1', 
    title: 'Intro', 
    capo: 0,
    measures: [JSON.parse(JSON.stringify(EMPTY_MEASURE))],
    chords: [Array(16).fill(null)],
    lyrics: [Array(16).fill(null)]
  };

  const [sections, setSections] = useState<TabSection[]>([initialSection]);
  const [activeSectionId, setActiveSectionId] = useState<string>('1');
  const [selection, setSelection] = useState<{ sectionId: string; measureIdx: number; stringIdx: number; colIdx: number } | null>(null);
  const [previewChord, setPreviewChord] = useState<ChordDefinition | null>(null);

  const [history, setHistory] = useState<TabSection[][]>([[initialSection]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const chordLibrary = useMemo(() => [...COMMON_CHORDS, ...customChords], [customChords]);

  // Load from local storage on mount
  useEffect(() => {
    const savedSong = localStorage.getItem('guitarflow_saved_song');
    if (savedSong) {
      try {
        const parsed = JSON.parse(savedSong);
        setSongTitle(parsed.title || 'My Awesome Riff');
        setSections(parsed.sections || [initialSection]);
        setCustomChords(parsed.customChords || []);
        setActiveSectionId(parsed.sections?.[0]?.id || '1');
        setTransposeOffset(parsed.transposeOffset || 0);
        // Initialize history with loaded state
        setHistory([parsed.sections]);
        setHistoryIndex(0);
      } catch (e) {
        console.error("Failed to load saved song", e);
      }
    }
  }, []);

  const saveToLocalStorage = () => {
    setSaveStatus('saving');
    const songData = {
      title: songTitle,
      sections: sections,
      customChords: customChords,
      transposeOffset: transposeOffset
    };
    localStorage.setItem('guitarflow_saved_song', JSON.stringify(songData));
    
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 600);
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

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (viewMode !== 'edit') return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); return; }
    
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

    if (!selection) return;
    if (e.key >= '0' && e.key <= '9') {
      const nextSections = sections.map(sec => {
        if (sec.id === selection.sectionId) {
          const newMeasures = [...sec.measures];
          newMeasures[selection.measureIdx][selection.stringIdx][selection.colIdx] = e.key;
          return { ...sec, measures: newMeasures };
        }
        return sec;
      });
      commitToHistory(nextSections);
      setSelection(prev => (prev && prev.colIdx < 15) ? { ...prev, colIdx: prev.colIdx + 1 } : prev);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      const nextSections = sections.map(sec => {
        if (sec.id === selection.sectionId) {
          const newMeasures = [...sec.measures];
          const newChords = [...sec.chords];
          newMeasures[selection.measureIdx][selection.stringIdx][selection.colIdx] = '-';
          newChords[selection.measureIdx][selection.colIdx] = null;
          return { ...sec, measures: newMeasures, chords: newChords };
        }
        return sec;
      });
      commitToHistory(nextSections);
    } else if (e.key === 'ArrowRight') {
      setSelection(prev => prev ? { ...prev, colIdx: Math.min(15, prev.colIdx + 1) } : null);
    } else if (e.key === 'ArrowLeft') {
      setSelection(prev => prev ? { ...prev, colIdx: Math.max(0, prev.colIdx - 1) } : null);
    } else if (e.key === 'ArrowUp') {
      setSelection(prev => prev ? { ...prev, stringIdx: Math.max(0, prev.stringIdx - 1) } : null);
    } else if (e.key === 'ArrowDown') {
      setSelection(prev => prev ? { ...prev, stringIdx: Math.min(5, prev.stringIdx + 1) } : null);
    }
  }, [selection, sections, viewMode, undo, redo]);

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
          const parsed = parseInt(n, 10);
          return isNaN(parsed) ? null : parsed;
        });
        return { name: 'Custom', frets: frets } as ChordDefinition;
      }
    }
    return null;
  };

  const activeChord = getActiveChord();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-orange-500 p-2 rounded-xl text-white shadow-lg shadow-orange-500/20">
            <Music size={24} />
          </div>
          <input 
            value={songTitle}
            onChange={e => setSongTitle(e.target.value)}
            className="text-xl font-black text-slate-800 bg-transparent border-none outline-none focus:ring-0 w-64 md:w-auto"
          />
        </div>
        
        <nav className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl mx-4">
          <button onClick={() => setViewMode('edit')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'edit' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            <Edit3 size={16} /> Edit
          </button>
          <button onClick={() => setViewMode('preview')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'preview' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            <Eye size={16} /> Preview
          </button>
          <button onClick={() => setViewMode('library')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'library' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            <Book size={16} /> Chords
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <div className="px-3 py-1 flex flex-col items-center">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-0.5">Key</span>
              <span className={`text-xs font-black leading-none ${transposeOffset === 0 ? 'text-slate-400' : 'text-orange-600'}`}>
                {transposeOffset > 0 ? `+${transposeOffset}` : transposeOffset}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <button 
                onClick={() => setTransposeOffset(prev => Math.min(12, prev + 1))}
                className="p-1 hover:bg-white text-slate-500 hover:text-orange-600 rounded-md transition-all active:scale-95"
                title="Transpose Up"
              >
                <ChevronUp size={14} strokeWidth={3} />
              </button>
              <button 
                onClick={() => setTransposeOffset(prev => Math.max(-12, prev - 1))}
                className="p-1 hover:bg-white text-slate-500 hover:text-orange-600 rounded-md transition-all active:scale-95"
                title="Transpose Down"
              >
                <ChevronDown size={14} strokeWidth={3} />
              </button>
            </div>
            {transposeOffset !== 0 && (
              <button 
                onClick={() => setTransposeOffset(0)}
                className="p-1.5 ml-1 bg-white text-slate-400 hover:text-slate-900 rounded-lg shadow-sm transition-all"
                title="Reset Key"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
            <button onClick={undo} disabled={historyIndex === 0} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-all hover:bg-white rounded-lg" title="Undo (Ctrl+Z)">
              <Undo2 size={18} />
            </button>
            <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-all hover:bg-white rounded-lg" title="Redo (Ctrl+Y)">
              <Redo2 size={18} />
            </button>
          </div>

          <button 
            onClick={saveToLocalStorage} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
              saveStatus === 'saved' 
                ? 'bg-emerald-50 border-emerald-500 text-emerald-600' 
                : 'bg-white border-slate-200 text-slate-700 hover:border-orange-500 hover:text-orange-600 shadow-sm'
            }`}
          >
            {saveStatus === 'saving' ? (
              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : saveStatus === 'saved' ? (
              <CheckCircle2 size={18} />
            ) : (
              <Save size={18} />
            )}
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
          </button>

          <button 
            onClick={exportAsFile}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
          >
            <Download size={18} /> Export
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {viewMode === 'edit' && (
          <>
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sections</h3>
                <button onClick={addSection} className="p-1 text-orange-500 hover:bg-orange-50 rounded">
                  <Plus size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {sections.map(sec => (
                  <button 
                    key={sec.id}
                    onClick={() => setActiveSectionId(sec.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all border-2 ${activeSectionId === sec.id ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                  >
                    {sec.title}
                  </button>
                ))}
              </div>
            </aside>

            <div className="flex-1 overflow-x-auto bg-slate-100 p-8 flex flex-col gap-8">
              {currentSection && (
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 min-w-max">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-6">
                      <input 
                        value={currentSection.title}
                        onChange={e => {
                          const next = sections.map(s => s.id === activeSectionId ? {...s, title: e.target.value} : s);
                          setSections(next);
                        }}
                        className="text-2xl font-black text-slate-900 border-b-2 border-transparent focus:border-orange-500 outline-none transition-all"
                      />
                      <div className="h-8 w-[1px] bg-slate-200" />
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 group">
                        <Anchor size={14} className="text-slate-400 group-hover:text-orange-500 transition-colors" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capo</span>
                        <select 
                          value={currentSection.capo}
                          onChange={(e) => setCapo(activeSectionId, parseInt(e.target.value, 10))}
                          className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
                        >
                          {Array.from({ length: 13 }).map((_, i) => (
                            <option key={i} value={i}>{i === 0 ? 'None' : i}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button 
                      onClick={() => addMeasure(activeSectionId)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-bold hover:bg-orange-100 transition-all"
                    >
                      <Plus size={16} /> Add Measure
                    </button>
                  </div>
                  
                  <div className="flex gap-4">
                    {currentSection.measures.map((measure, mIdx) => (
                      <TabMeasure 
                        key={mIdx}
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
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chord Tools</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {activeChord ? (
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Selected / Detected</span>
                    <div className="h-64">
                      <ChordDiagram chord={activeChord} />
                    </div>
                  </div>
                ) : (
                  <div className="h-64 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center p-8 text-center">
                    <p className="text-xs font-medium text-slate-400">Select a column or enter notes to see a chord preview</p>
                  </div>
                )}

                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Chord Library</span>
                  <div className="grid grid-cols-2 gap-2">
                    {chordLibrary.map(chord => (
                      <button 
                        key={chord.name}
                        draggable="true"
                        onDragStart={(e) => {
                          e.dataTransfer.setData('chordName', chord.name);
                        }}
                        onClick={() => handleChordInput(chord)}
                        className="cursor-grab active:cursor-grabbing px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600 transition-all flex items-center justify-center"
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
          <div className="flex-1 p-8 overflow-y-auto">
            <SongPreview 
              sections={sections} 
              customChords={customChords} 
              externalTranspose={transposeOffset}
            />
          </div>
        )}

        {viewMode === 'library' && (
          <ChordManager 
            customChords={customChords} 
            onAddChord={(c) => setCustomChords([...customChords, c])}
            onDeleteChord={(name) => setCustomChords(customChords.filter(c => c.name !== name))}
          />
        )}
      </main>
    </div>
  );
};

export default App;
