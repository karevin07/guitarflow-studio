import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Music2, X } from 'lucide-react';
import { ChordDefinition } from '../types';
import { findChordVoicings } from '../guitar';
import { formatPitch, getChordPitchClasses, parseChord } from '../music-theory';
import ChordDiagram from './ChordDiagram';

interface ChordWorkspacePanelProps {
  symbol: string | null;
  chordLibrary: ChordDefinition[];
  theme: 'light' | 'dark';
  onClose?: () => void;
  compact?: boolean;
}

const ChordWorkspacePanel: React.FC<ChordWorkspacePanelProps> = ({
  symbol,
  chordLibrary,
  theme,
  onClose,
  compact = false,
}) => {
  const [voicingIndex, setVoicingIndex] = useState(0);
  const result = useMemo(
    () => symbol ? findChordVoicings(symbol, chordLibrary, undefined, { limit: 8 }) : null,
    [symbol, chordLibrary]
  );

  useEffect(() => setVoicingIndex(0), [symbol]);

  const shape = result?.shapes[voicingIndex] ?? null;
  const parsed = symbol ? parseChord(symbol) : null;
  const notes = parsed
    ? getChordPitchClasses(parsed).map(pitch => formatPitch(pitch, parsed.accidentalPreference))
    : [];
  const difficulty = !shape || shape.score >= 125 ? 'Easy' : shape.score >= 105 ? 'Medium' : 'Advanced';
  const fretText = shape?.frets.map(fret => fret ?? 'X').reverse().join(' ') ?? '';

  return (
    <div className={`flex h-full flex-col ${compact ? 'px-5 pb-6' : 'p-6'}`}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-zinc-800">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">
            Now viewing
          </span>
          <h2 className="mt-1 font-mono text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
            {symbol ?? 'Select a chord'}
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Close chord panel"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {shape && symbol ? (
        <>
          <div className="flex min-h-0 flex-1 items-center justify-center py-4">
            <ChordDiagram
              chord={{ name: symbol, frets: shape.frets, fingers: shape.fingers, barres: shape.barres }}
              size={compact ? 180 : 210}
              theme={theme}
              variant="bare"
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-100/80 px-4 py-3 dark:bg-zinc-800/60">
              <div className="font-mono text-sm font-semibold tracking-[0.16em] text-slate-800 dark:text-zinc-100">
                {fretText}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                <span>{shape.source === 'curated' ? 'Library' : 'Generated'}</span>
                <span aria-hidden="true">·</span>
                <span>{difficulty}</span>
                {shape.tags.map(tag => <span key={tag}>· {tag}</span>)}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setVoicingIndex(index => Math.max(0, index - 1))}
                disabled={voicingIndex === 0}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-25 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-violet-700 dark:hover:text-violet-400"
                aria-label="Previous voicing"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="text-center">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-500">
                  Voicing
                </div>
                <div className="mt-0.5 text-sm font-semibold text-slate-700 dark:text-zinc-200">
                  {voicingIndex + 1} / {result.shapes.length}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVoicingIndex(index => Math.min(result.shapes.length - 1, index + 1))}
                disabled={voicingIndex >= result.shapes.length - 1}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-25 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-violet-700 dark:hover:text-violet-400"
                aria-label="Next voicing"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 border-t border-slate-200/80 pt-4 dark:border-zinc-800">
              <Music2 size={14} className="text-indigo-500 dark:text-violet-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Chord tones</span>
              <span className="ml-auto font-mono text-xs font-semibold text-slate-700 dark:text-zinc-200">{notes.join(' · ')}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500">
            <Music2 size={24} />
          </div>
          <p className="max-w-[220px] text-sm leading-6 text-slate-500 dark:text-zinc-400">
            Choose a chord in the score to see its fingering and alternatives.
          </p>
        </div>
      )}
    </div>
  );
};

export default ChordWorkspacePanel;
