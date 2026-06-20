import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Music, Pause, Play, Square } from 'lucide-react';
import type { AlphaTabApi } from '@coderline/alphatab';
import { ImportedSong } from '../types';
import { getImportedSongData } from '../services/importedSongsDb';
import AlphaTabViewer from './AlphaTabViewer';

interface ImportedSongViewProps {
  song: ImportedSong;
  onBack: () => void;
  onTitleChange?: (title: string) => void;
  onError: (message: string) => void;
}

const ImportedSongView: React.FC<ImportedSongViewProps> = ({
  song,
  onBack,
  onTitleChange,
  onError,
}) => {
  const apiRef = useRef<AlphaTabApi | null>(null);
  const [scoreData, setScoreData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [title, setTitle] = useState(song.title);

  useEffect(() => {
    setTitle(song.title);
  }, [song.title]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getImportedSongData(song.id)
      .then(data => {
        if (cancelled) return;
        if (!data) {
          onError('Imported file not found in this browser.');
          setScoreData(null);
          return;
        }
        setScoreData(data);
      })
      .catch(() => {
        if (!cancelled) onError('Could not read imported file from storage.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [song.id, onError]);

  const handleReady = useCallback((api: AlphaTabApi) => {
    apiRef.current = api;
  }, []);

  const handlePlayPause = () => {
    apiRef.current?.playPause();
  };

  const handleStop = () => {
    apiRef.current?.stop();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100">
      <header className="bg-white dark:bg-zinc-900/50 backdrop-blur-xl border-b border-slate-200 dark:border-zinc-800/80 px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all shrink-0"
            title="Back to Home"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="bg-gradient-to-tr from-amber-500 to-orange-600 p-2 rounded-xl text-white shadow-lg shrink-0">
            <Music size={24} />
          </div>
          <div className="min-w-0">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => onTitleChange?.(title)}
              className="text-xl font-bold text-slate-800 dark:text-zinc-100 bg-transparent border-none outline-none focus:ring-0 w-full truncate"
            />
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
                {song.importFormat.toUpperCase()}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                Guitar Pro · Read-only
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            disabled={!scoreData || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-indigo-600 dark:bg-violet-600 text-white hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={handleStop}
            disabled={!scoreData || loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-all"
            title="Stop"
          >
            <Square size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
          {loading && (
            <div className="p-16 text-center text-slate-400 dark:text-zinc-500 font-medium">
              Loading imported score…
            </div>
          )}
          {!loading && !scoreData && (
            <div className="p-16 text-center text-slate-400 dark:text-zinc-500 font-medium">
              Score data unavailable.
            </div>
          )}
          {!loading && scoreData && (
            <AlphaTabViewer
              key={song.id}
              data={scoreData}
              onReady={handleReady}
              onScoreLoaded={loadedTitle => {
                if (loadedTitle && loadedTitle !== title) {
                  setTitle(loadedTitle);
                  onTitleChange?.(loadedTitle);
                }
              }}
              onPlayerStateChange={setIsPlaying}
              onError={onError}
            />
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-zinc-800 px-8 py-3 text-center">
        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-widest">
          Rendered with alphaTab · Stored locally in this browser
        </p>
      </footer>
    </div>
  );
};

export default ImportedSongView;
