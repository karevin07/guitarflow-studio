import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bookmark, Library, Moon, Sun } from 'lucide-react';
import { ChordDefinition } from '../types';
import ChordManager from './ChordManager';
import AppRail, { AppDestination } from './AppRail';

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
  onRailNavigate: (destination: AppDestination) => void;
  onToggleTheme: () => void;
  initialChord?: string | null;
}

const HomeChordLab: React.FC<HomeChordLabProps> = ({
  globalChords,
  theme,
  onBack,
  onRailNavigate,
  onToggleTheme,
  initialChord = null,
}) => {
  const [savedShapes, setSavedShapes] = useState<ChordDefinition[]>(loadSavedShapes);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedShapes));
  }, [savedShapes]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f7f5ef] text-[#171a18] dark:bg-[#151616] dark:text-zinc-100 lg:pl-[72px]">
      <AppRail active="chords" theme={theme} onNavigate={destination => { if (destination !== 'chords') onRailNavigate(destination); }} onToggleTheme={onToggleTheme} />
      <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-[#dedcd4] bg-[#fffefa] px-3 dark:border-zinc-800 dark:bg-[#171818] sm:px-5 lg:px-8">
        <button type="button" onClick={onBack} className="grid h-11 w-11 place-items-center rounded-xl text-[#6e716b] hover:bg-[#efede7] dark:text-zinc-400 dark:hover:bg-zinc-900 lg:hidden" aria-label="回到歌曲庫">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold tracking-[-0.02em] sm:text-xl">和弦庫</h1>
          <p className="truncate text-[11px] text-[#85877f] dark:text-zinc-500">搜尋、比較並收藏適合你的吉他按法</p>
        </div>
        <div className="hidden items-center gap-4 text-[11px] text-[#85877f] sm:flex"><span className="flex items-center gap-1.5"><Library size={14} />{globalChords.length} 個基礎指法</span><span className="flex items-center gap-1.5"><Bookmark size={14} />{savedShapes.length} 個收藏</span></div>
        <button type="button" onClick={onToggleTheme} className="grid h-11 w-11 place-items-center rounded-xl text-[#6e716b] hover:bg-[#efede7] dark:text-zinc-400 dark:hover:bg-zinc-900 lg:hidden" aria-label="切換主題">
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </header>

      <main className="flex min-h-0 flex-1">
        <ChordManager
          customChords={savedShapes}
          globalChords={globalChords}
          onAddChord={chord => setSavedShapes(current => current.some(saved => saved.name === chord.name && saved.frets.every((fret, index) => fret === chord.frets[index])) ? current : [...current, chord])}
          onDeleteChord={name => setSavedShapes(current => current.filter(chord => chord.name !== name))}
          theme={theme}
          initialChord={initialChord}
        />
      </main>
    </div>
  );
};

export default HomeChordLab;
