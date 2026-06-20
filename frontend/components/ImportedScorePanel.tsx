import React from 'react';
import type { AlphaTabApi } from '@coderline/alphatab';
import AlphaTabViewer from './AlphaTabViewer';
import TrackSelector from './TrackSelector';
import { AlphaTabTrackInfo } from '../types/alphatab';

interface ImportedScorePanelProps {
  songId: string;
  scoreData: ArrayBuffer | null;
  loading: boolean;
  onReady: (api: AlphaTabApi) => void;
  onScoreLoaded?: (title: string) => void;
  onError: (message: string) => void;
  tracks: AlphaTabTrackInfo[];
  selectedTracks: number[];
  onToggleTrack: (index: number) => void;
  onSelectAllTracks: () => void;
  onSelectGuitarTracks: () => void;
}

const ImportedScorePanel: React.FC<ImportedScorePanelProps> = ({
  songId,
  scoreData,
  loading,
  onReady,
  onScoreLoaded,
  onError,
  tracks,
  selectedTracks,
  onToggleTrack,
  onSelectAllTracks,
  onSelectGuitarTracks,
}) => (
  <div className="flex-1 overflow-auto p-6 md:p-8 pb-32">
    <div className="max-w-6xl mx-auto bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
      <TrackSelector
        tracks={tracks}
        selected={selectedTracks}
        onToggle={onToggleTrack}
        onSelectAll={onSelectAllTracks}
        onSelectGuitar={onSelectGuitarTracks}
      />
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
          key={songId}
          data={scoreData}
          onReady={onReady}
          onScoreLoaded={onScoreLoaded}
          onError={onError}
        />
      )}
    </div>
  </div>
);

export default ImportedScorePanel;
