import type { TempoTrainer } from '../services/practiceTools';

export interface PlaybackPosition {
  sectionIdx: number;
  measureIdx: number;
  colIdx: number;
  /** Step in the song's play order; a section played twice has two steps. */
  step?: number;
}

/** Shared props for PlayerBar — gflow and alphaTab engines adapt into this shape. */
export interface PlayerBarBindings {
  mode: 'gflow' | 'alphatab';
  isPlaying: boolean;
  isPaused: boolean;
  onTogglePlayPause: () => void;
  onStop: () => void;
  playIndex: number;
  totalCols: number;
  onSeek: (index: number) => void;
  abLoop: { enabled: boolean; start: number | null; end: number | null };
  onSetLoopA: () => void;
  onSetLoopB: () => void;
  onToggleAbLoop: () => void;
  onClearAbLoop: () => void;
  playBpm: number;
  onBpmChange: (bpm: number) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  isMetronomeOn: boolean;
  onToggleMetronome: () => void;
  playbackVolume: number;
  onVolumeChange: (volume: number) => void;
  /** Beats left in the count-in, or null when not counting in (GuitarFlow songs only). */
  countInBeat?: number | null;
  countInBars?: number;
  onCountInBarsChange?: (bars: number) => void;
  tempoTrainer?: TempoTrainer;
  onTempoTrainerChange?: (trainer: TempoTrainer) => void;
}
