import React, { useEffect, useState } from 'react';
import { ArrowLeft, Guitar, Moon, Sun } from 'lucide-react';
import { ChordDefinition } from '../types';
import ChordManager from './ChordManager';

const STORAGE_KEY = 'guitarflow-chord-lab-shapes';

const loadSavedShapes = (): ChordDefinition[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

interface HomeChordLabProps {
  globalChords: ChordDefinition[];
  theme: 'light' | 'dark';
  onBack: () => void;
  onToggleTheme: () => void;
}

const HomeChordLab: React.FC<HomeChordLabProps> = ({
  globalChords,
  theme,
  onBack,
  onToggleTheme,
}) => {
  const [savedShapes, setSavedShapes] = useState<ChordDefinition[]>(loadSavedShapes);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedShapes));
  }, [savedShapes]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f4f4f1] text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 dark:border-zinc-800 dark:bg-zinc-950 sm:px-5">
        <button type="button" onClick={onBack} className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-900" aria-label="Back to library">
          <ArrowLeft size={18} />
        </button>
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white dark:bg-zinc-100 dark:text-zinc-950"><Guitar size={17} /></div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold tracking-tight sm:text-base">Chord lab</h1>
          <p className="truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-zinc-500">Explore, compare, and save guitar shapes</p>
        </div>
        <button type="button" onClick={onToggleTheme} className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-900" aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </header>

      <main className="flex min-h-0 flex-1">
        <ChordManager
          customChords={savedShapes}
          globalChords={globalChords}
          onAddChord={chord => setSavedShapes(current => [...current, chord])}
          onDeleteChord={name => setSavedShapes(current => current.filter(chord => chord.name !== name))}
          theme={theme}
        />
      </main>
    </div>
  );
};

export default HomeChordLab;
