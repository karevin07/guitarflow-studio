import React from 'react';
import TabMeasure from './TabMeasure';

interface ScoreLineProps {
  measure: string[][];
  chords: (string | null)[];
  lyrics: (string | null)[];
  playCol: number | null;
  theme: 'light' | 'dark';
  playKey?: string;
  className?: string;
  onSelectCell?: (stringIdx: number, colIdx: number) => void;
}

const noop = () => {};

/**
 * Read-only practice measure row — wraps TabMeasure without edit affordances.
 */
const ScoreLine: React.FC<ScoreLineProps> = ({
  measure,
  chords,
  lyrics,
  playCol,
  theme,
  playKey,
  className = '',
  onSelectCell,
}) => (
  <div className={className} data-play-key={playKey}>
    <TabMeasure
      measure={measure}
      chords={chords}
      lyrics={lyrics}
      activeCol={null}
      activeString={null}
      playCol={playCol}
      onCellClick={(stringIdx, colIdx) => onSelectCell?.(stringIdx, colIdx)}
      onChordClick={noop}
      onChordNameChange={noop}
      onLyricChange={noop}
      onDelete={undefined}
      onCopy={undefined}
      onClearColumn={undefined}
      onDropChord={undefined}
      canDelete={false}
      theme={theme}
    />
  </div>
);

export default ScoreLine;
