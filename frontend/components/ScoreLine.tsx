import React from 'react';
import TabMeasure from './TabMeasure';

interface ScoreLineBaseProps {
  measure: string[][];
  chords: (string | null)[];
  lyrics: (string | null)[];
  playCol: number | null;
  theme: 'light' | 'dark';
  playKey?: string;
  className?: string;
  variant?: 'card' | 'flow';
  measureIndex?: number;
}

interface ScoreLineReadonlyProps extends ScoreLineBaseProps {
  mode?: 'readonly';
  onSelectCell?: (stringIdx: number, colIdx: number) => void;
}

interface ScoreLineEditProps extends ScoreLineBaseProps {
  mode: 'edit';
  activeCol: number | null;
  activeString: number | null;
  onCellClick: (stringIdx: number, colIdx: number) => void;
  onChordClick: (colIdx: number) => void;
  onChordNameChange: (colIdx: number, name: string) => void;
  onLyricChange: (colIdx: number, text: string) => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onClearColumn: (colIdx: number) => void;
  onDropChord: (colIdx: number, chordName: string) => void;
  canDelete: boolean;
}

export type ScoreLineProps = ScoreLineReadonlyProps | ScoreLineEditProps;

const noop = () => {};

const ScoreLine: React.FC<ScoreLineProps> = props => {
  const {
    measure,
    chords,
    lyrics,
    playCol,
    theme,
    playKey,
    className = '',
    variant = 'card',
    measureIndex,
  } = props;

  const isEdit = props.mode === 'edit';

  return (
    <div className={className} data-play-key={playKey}>
      <TabMeasure
        measure={measure}
        chords={chords}
        lyrics={lyrics}
        activeCol={isEdit ? props.activeCol : null}
        activeString={isEdit ? props.activeString : null}
        playCol={playCol}
        onCellClick={
          isEdit
            ? props.onCellClick
            : (stringIdx, colIdx) => props.onSelectCell?.(stringIdx, colIdx)
        }
        onChordClick={isEdit ? props.onChordClick : noop}
        onChordNameChange={isEdit ? props.onChordNameChange : noop}
        onLyricChange={isEdit ? props.onLyricChange : noop}
        onDelete={isEdit ? props.onDelete : undefined}
        onCopy={isEdit ? props.onCopy : undefined}
        onClearColumn={isEdit ? props.onClearColumn : undefined}
        onDropChord={isEdit ? props.onDropChord : undefined}
        canDelete={isEdit ? props.canDelete : false}
        theme={theme}
        variant={variant}
        measureIndex={measureIndex}
        showMeasureFooter={variant === 'card'}
      />
    </div>
  );
};

export default ScoreLine;
