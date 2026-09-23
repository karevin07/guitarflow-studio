import { useState, useMemo, useCallback, useEffect } from 'react';
import { TabSection, ChordDefinition, SongVoicingPlan } from '../types';
import { api } from '../services/api';
import { detectChordFromColumn, labelChordColumn } from '../services/chordDetector';
import { DEFAULT_TIME_SIGNATURE } from '../constants/practice';

export const createEmptyMeasure = (): string[][] =>
  Array.from({ length: 6 }, () => Array(16).fill('-'));

export const useEditorState = () => {
  const [songTitle, setSongTitle] = useState('My Awesome Riff');
  const [sections, setSections] = useState<TabSection[]>([]);
  const [customChords, setCustomChords] = useState<ChordDefinition[]>([]);
  const [globalChords, setGlobalChords] = useState<ChordDefinition[]>([]);
  const [transposeOffset, setTransposeOffset] = useState(0);
  const [voicingPlan, setVoicingPlan] = useState<SongVoicingPlan>({});

  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const [selection, setSelectionRaw] = useState<{
    sectionId: string;
    measureIdx: number;
    stringIdx: number;
    colIdx: number;
  } | null>(null);
  const [previewChord, setPreviewChord] = useState<ChordDefinition | null>(null);

  const [history, setHistory] = useState<TabSection[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    api.fetchGlobalChords()
      .then(setGlobalChords)
      .catch(err => console.error("Failed to load global chords:", err));
  }, []);

  const chordLibrary = useMemo(() => [...globalChords, ...customChords], [globalChords, customChords]);

  // Clear previewChord whenever selection changes so we show the column's real chord
  const setSelection = useCallback(
    (sel: typeof selection) => {
      setSelectionRaw(sel);
      setPreviewChord(null);
    },
    []
  );

  /** Load a song's data into the editor (called when opening a song) */
  const loadSong = useCallback(
    (title: string, newSections: TabSection[], chords: ChordDefinition[], transpose: number, plan: SongVoicingPlan = {}) => {
      setSongTitle(title);
      setSections(newSections);
      setCustomChords(chords);
      setTransposeOffset(transpose);
      setVoicingPlan(plan);
      setActiveSectionId(newSections[0]?.id || '');
      setHistory([newSections]);
      setHistoryIndex(0);
      setSelectionRaw(null);
      setPreviewChord(null);
    },
    []
  );

  const commitToHistory = useCallback((newSections: TabSection[]) => {
    setHistory(prev => {
      const nextHistory = prev.slice(0, prev.length); // keep reference
      // We use the functional form to access current historyIndex
      return nextHistory;
    });
    // Use functional updates to avoid stale closure issues
    setHistoryIndex(prevIdx => {
      const nextHistory = history.slice(0, prevIdx + 1);
      nextHistory.push(JSON.parse(JSON.stringify(newSections)));
      if (nextHistory.length > 50) nextHistory.shift();
      setHistory(nextHistory);
      setSections(newSections);
      return nextHistory.length - 1;
    });
  }, [history]);

  const undo = useCallback(() => {
    setHistoryIndex(prevIdx => {
      if (prevIdx > 0) {
        const nextIndex = prevIdx - 1;
        setSections(JSON.parse(JSON.stringify(history[nextIndex])));
        return nextIndex;
      }
      return prevIdx;
    });
  }, [history]);

  const redo = useCallback(() => {
    setHistoryIndex(prevIdx => {
      if (prevIdx < history.length - 1) {
        const nextIndex = prevIdx + 1;
        setSections(JSON.parse(JSON.stringify(history[nextIndex])));
        return nextIndex;
      }
      return prevIdx;
    });
  }, [history]);

  const updateLyric = useCallback((sectionId: string, mIdx: number, cIdx: number, text: string) => {
    setSections(prev => {
      const next = prev.map(sec => {
        if (sec.id !== sectionId) return sec;
        const newLyrics = [...sec.lyrics];
        newLyrics[mIdx] = [...newLyrics[mIdx]];
        newLyrics[mIdx][cIdx] = text || null;
        return { ...sec, lyrics: newLyrics };
      });
      // commit inline
      setHistoryIndex(prevIdx => {
        const nextHistory = history.slice(0, prevIdx + 1);
        nextHistory.push(JSON.parse(JSON.stringify(next)));
        if (nextHistory.length > 50) nextHistory.shift();
        setHistory(nextHistory);
        return nextHistory.length - 1;
      });
      return next;
    });
  }, [history]);

  const setCapo = useCallback((sectionId: string, fret: number) => {
    setSections(prev => {
      const next = prev.map(sec =>
        sec.id === sectionId ? { ...sec, capo: fret } : sec
      );
      setHistoryIndex(prevIdx => {
        const nextHistory = history.slice(0, prevIdx + 1);
        nextHistory.push(JSON.parse(JSON.stringify(next)));
        if (nextHistory.length > 50) nextHistory.shift();
        setHistory(nextHistory);
        return nextHistory.length - 1;
      });
      return next;
    });
  }, [history]);

  const setTimeSignature = useCallback((sectionId: string, timeSignature: [number, number]) => {
    setSections(prev => {
      const next = prev.map(sec =>
        sec.id === sectionId ? { ...sec, timeSignature } : sec
      );
      setHistoryIndex(prevIdx => {
        const nextHistory = history.slice(0, prevIdx + 1);
        nextHistory.push(JSON.parse(JSON.stringify(next)));
        if (nextHistory.length > 50) nextHistory.shift();
        setHistory(nextHistory);
        return nextHistory.length - 1;
      });
      return next;
    });
  }, [history]);

  const addMeasure = useCallback((sectionId: string) => {
    setSections(prev => {
      const next = prev.map(sec => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          measures: [...sec.measures, createEmptyMeasure()],
          chords: [...sec.chords, Array(16).fill(null)],
          lyrics: [...sec.lyrics, Array(16).fill(null)],
        };
      });
      setHistoryIndex(prevIdx => {
        const nextHistory = history.slice(0, prevIdx + 1);
        nextHistory.push(JSON.parse(JSON.stringify(next)));
        if (nextHistory.length > 50) nextHistory.shift();
        setHistory(nextHistory);
        return nextHistory.length - 1;
      });
      return next;
    });
  }, [history]);

  const deleteMeasure = useCallback((sectionId: string, mIdx: number) => {
    setSections(prev => {
      const next = prev.map(sec => {
        if (sec.id !== sectionId) return sec;
        if (sec.measures.length <= 1) return sec;
        const newMeasures = [...sec.measures];
        const newChords = [...sec.chords];
        const newLyrics = [...sec.lyrics];
        newMeasures.splice(mIdx, 1);
        newChords.splice(mIdx, 1);
        newLyrics.splice(mIdx, 1);
        return { ...sec, measures: newMeasures, chords: newChords, lyrics: newLyrics };
      });
      setHistoryIndex(prevIdx => {
        const nextHistory = history.slice(0, prevIdx + 1);
        nextHistory.push(JSON.parse(JSON.stringify(next)));
        if (nextHistory.length > 50) nextHistory.shift();
        setHistory(nextHistory);
        return nextHistory.length - 1;
      });
      return next;
    });
    setSelectionRaw(null);
  }, [history]);

  const copyMeasure = useCallback((sectionId: string, mIdx: number) => {
    setSections(prev => {
      const next = prev.map(sec => {
        if (sec.id !== sectionId) return sec;
        const newMeasures = [...sec.measures];
        const newChords = [...sec.chords];
        const newLyrics = [...sec.lyrics];
        newMeasures.splice(mIdx + 1, 0, JSON.parse(JSON.stringify(newMeasures[mIdx])));
        newChords.splice(mIdx + 1, 0, [...newChords[mIdx]]);
        newLyrics.splice(mIdx + 1, 0, [...newLyrics[mIdx]]);
        return { ...sec, measures: newMeasures, chords: newChords, lyrics: newLyrics };
      });
      setHistoryIndex(prevIdx => {
        const nextHistory = history.slice(0, prevIdx + 1);
        nextHistory.push(JSON.parse(JSON.stringify(next)));
        if (nextHistory.length > 50) nextHistory.shift();
        setHistory(nextHistory);
        return nextHistory.length - 1;
      });
      return next;
    });
  }, [history]);

  const clearColumn = useCallback((sectionId: string, mIdx: number, cIdx: number) => {
    setSections(prev => {
      const next = prev.map(sec => {
        if (sec.id !== sectionId) return sec;
        const newMeasures = [...sec.measures];
        const newChords = [...sec.chords];
        const newLyrics = [...sec.lyrics];
        for (let s = 0; s < 6; s++) {
          newMeasures[mIdx][s][cIdx] = '-';
        }
        newChords[mIdx][cIdx] = null;
        newLyrics[mIdx][cIdx] = null;
        return { ...sec, measures: newMeasures, chords: newChords, lyrics: newLyrics };
      });
      setHistoryIndex(prevIdx => {
        const nextHistory = history.slice(0, prevIdx + 1);
        nextHistory.push(JSON.parse(JSON.stringify(next)));
        if (nextHistory.length > 50) nextHistory.shift();
        setHistory(nextHistory);
        return nextHistory.length - 1;
      });
      return next;
    });
  }, [history]);

  const updateSectionTitle = useCallback((sectionId: string, title: string) => {
    setSections(prev => {
      const next = prev.map(sec => (sec.id === sectionId ? { ...sec, title } : sec));
      setHistoryIndex(prevIdx => {
        const nextHistory = history.slice(0, prevIdx + 1);
        nextHistory.push(JSON.parse(JSON.stringify(next)));
        if (nextHistory.length > 50) nextHistory.shift();
        setHistory(nextHistory);
        return nextHistory.length - 1;
      });
      return next;
    });
  }, [history]);

  const deleteSection = useCallback((sectionId: string) => {
    setSections(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter(sec => sec.id !== sectionId);
      setHistoryIndex(prevIdx => {
        const nextHistory = history.slice(0, prevIdx + 1);
        nextHistory.push(JSON.parse(JSON.stringify(next)));
        if (nextHistory.length > 50) nextHistory.shift();
        setHistory(nextHistory);
        return nextHistory.length - 1;
      });
      setActiveSectionId(current => (current === sectionId ? next[0]?.id ?? current : current));
      setSelectionRaw(null);
      return next;
    });
  }, [history]);

  const moveSection = useCallback((sectionId: string, direction: 'up' | 'down') => {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === sectionId);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      setHistoryIndex(prevIdx => {
        const nextHistory = history.slice(0, prevIdx + 1);
        nextHistory.push(JSON.parse(JSON.stringify(next)));
        if (nextHistory.length > 50) nextHistory.shift();
        setHistory(nextHistory);
        return nextHistory.length - 1;
      });
      return next;
    });
  }, [history]);

  const addSection = useCallback(() => {
    const newId = Math.random().toString(36).slice(2, 11);
    setSections(prev => {
      const next = [
        ...prev,
        {
          id: newId,
          title: 'New Section',
          capo: 0,
          timeSignature: [...DEFAULT_TIME_SIGNATURE] as [number, number],
          measures: [createEmptyMeasure()],
          chords: [Array(16).fill(null)],
          lyrics: [Array(16).fill(null)],
        },
      ];
      setHistoryIndex(prevIdx => {
        const nextHistory = history.slice(0, prevIdx + 1);
        nextHistory.push(JSON.parse(JSON.stringify(next)));
        if (nextHistory.length > 50) nextHistory.shift();
        setHistory(nextHistory);
        return nextHistory.length - 1;
      });
      return next;
    });
    setActiveSectionId(newId);
  }, [history]);

  const insertSectionAfter = useCallback((afterSectionId: string, section: Omit<TabSection, 'id'>) => {
    const newId = Math.random().toString(36).slice(2, 11);
    setSections(prev => {
      const index = prev.findIndex(candidate => candidate.id === afterSectionId);
      const next = [...prev];
      next.splice(index < 0 ? prev.length : index + 1, 0, { ...section, id: newId });
      setHistoryIndex(prevIdx => {
        const nextHistory = history.slice(0, prevIdx + 1);
        nextHistory.push(JSON.parse(JSON.stringify(next)));
        if (nextHistory.length > 50) nextHistory.shift();
        setHistory(nextHistory);
        return nextHistory.length - 1;
      });
      return next;
    });
    setActiveSectionId(newId);
    return newId;
  }, [history]);

  const applyChordToColumn = useCallback(
    (sectionId: string, mIdx: number, cIdx: number, chord: ChordDefinition) => {
      setSections(prev => {
        const next = prev.map(sec => {
          if (sec.id !== sectionId) return sec;
          const newMeasures = [...sec.measures];
          const newChords = [...sec.chords];
          chord.frets.forEach((fret, sIdx) => {
            newMeasures[mIdx][sIdx][cIdx] = fret === null ? '-' : fret.toString();
          });
          newChords[mIdx][cIdx] = chord.name;
          return { ...sec, measures: newMeasures, chords: newChords };
        });
        setHistoryIndex(prevIdx => {
          const nextHistory = history.slice(0, prevIdx + 1);
          nextHistory.push(JSON.parse(JSON.stringify(next)));
          if (nextHistory.length > 50) nextHistory.shift();
          setHistory(nextHistory);
          return nextHistory.length - 1;
        });
        return next;
      });
    },
    [history]
  );

  const handleChordNameChange = useCallback(
    (sectionId: string, mIdx: number, cIdx: number, name: string) => {
      setSections(prev => {
        const next = prev.map(sec => {
          if (sec.id !== sectionId) return sec;
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
        });
        setHistoryIndex(prevIdx => {
          const nextHistory = history.slice(0, prevIdx + 1);
          nextHistory.push(JSON.parse(JSON.stringify(next)));
          if (nextHistory.length > 50) nextHistory.shift();
          setHistory(nextHistory);
          return nextHistory.length - 1;
        });
        return next;
      });
    },
    [history, chordLibrary]
  );

  const confirmDetectedChordName = useCallback(
    (sectionId: string, mIdx: number, cIdx: number, name: string) => {
      setSections(prev => {
        const next = labelChordColumn(prev, sectionId, mIdx, cIdx, name);
        if (next.every((section, index) => section === prev[index])) return prev;
        setHistoryIndex(prevIdx => {
          const nextHistory = history.slice(0, prevIdx + 1);
          nextHistory.push(JSON.parse(JSON.stringify(next)));
          if (nextHistory.length > 50) nextHistory.shift();
          setHistory(nextHistory);
          return nextHistory.length - 1;
        });
        return next;
      });
    },
    [history]
  );

  const handleDropChord = useCallback(
    (sectionId: string, mIdx: number, cIdx: number, chordName: string) => {
      const chord = chordLibrary.find(c => c.name === chordName);
      if (chord) applyChordToColumn(sectionId, mIdx, cIdx, chord);
    },
    [chordLibrary, applyChordToColumn]
  );

  const handleChordInput = useCallback(
    (chord: ChordDefinition, currentSelection: typeof selection) => {
      if (!currentSelection) return;
      applyChordToColumn(currentSelection.sectionId, currentSelection.measureIdx, currentSelection.colIdx, chord);
      setPreviewChord(chord);
      setSelectionRaw(prev => {
        if (!prev) return null;
        const nextCol = prev.colIdx + 1;
        return nextCol < 16 ? { ...prev, colIdx: nextCol } : prev;
      });
    },
    [applyChordToColumn]
  );

  const getActiveChord = useCallback(
    (currentSection: TabSection | undefined): ChordDefinition | null => {
      if (previewChord) return previewChord;
      if (selection && currentSection) {
        const { measureIdx, colIdx } = selection;
        const chordName = currentSection.chords[measureIdx]?.[colIdx];
        const columnNotes = currentSection.measures[measureIdx]?.map(str => str[colIdx]);
        if (columnNotes) {
          const detected = detectChordFromColumn(columnNotes, chordLibrary);
          if (detected) return chordName ? { ...detected, name: chordName } : detected;
        }
        if (chordName) return chordLibrary.find(c => c.name === chordName) ?? null;
      }
      return null;
    },
    [previewChord, selection, chordLibrary]
  );

  return {
    // State
    songTitle, setSongTitle,
    sections, setSections,
    customChords, setCustomChords,
    globalChords, setGlobalChords,
    transposeOffset, setTransposeOffset,
    voicingPlan, setVoicingPlan,
    activeSectionId, setActiveSectionId,
    selection, setSelection,
    previewChord, setPreviewChord,
    history, historyIndex,
    chordLibrary,
    // Actions
    loadSong,
    commitToHistory,
    undo, redo,
    updateLyric, setCapo, setTimeSignature,
    addMeasure, deleteMeasure, copyMeasure, clearColumn,
    addSection, insertSectionAfter, updateSectionTitle, deleteSection, moveSection,
    applyChordToColumn,
    handleChordNameChange, confirmDetectedChordName, handleDropChord, handleChordInput,
    getActiveChord,
  };
};
