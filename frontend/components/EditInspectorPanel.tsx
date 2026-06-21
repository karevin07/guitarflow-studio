import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import NoteInspector from './NoteInspector';
import ChordDiagram from './ChordDiagram';
import { ChordDefinition } from '../types';
import { TechniqueInputHint } from '../services/tabNotation';

interface EditorSelection {
  sectionId: string;
  measureIdx: number;
  stringIdx: number;
  colIdx: number;
}

interface EditInspectorPanelProps {
  selection: EditorSelection | null;
  cellValue: string;
  techniqueHint: TechniqueInputHint | null;
  activeChord: ChordDefinition | null;
  chordLibrary: ChordDefinition[];
  theme: 'light' | 'dark';
  onApplyCell: (value: string) => void;
  onClearCell: () => void;
  onChordClick: (chord: ChordDefinition) => void;
}

const EditInspectorPanel: React.FC<EditInspectorPanelProps> = ({
  selection,
  cellValue,
  techniqueHint,
  activeChord,
  chordLibrary,
  theme,
  onApplyCell,
  onClearCell,
  onChordClick,
}) => {
  const [chordOpen, setChordOpen] = useState(true);

  return (
    <aside className="w-80 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-md border-l border-slate-200 dark:border-zinc-800/80 flex flex-col overflow-hidden transition-colors duration-250">
      <div className="p-6 border-b border-slate-200 dark:border-zinc-800/80">
        <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
          Inspector
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <NoteInspector
          selection={selection}
          cellValue={cellValue}
          techniqueHint={techniqueHint}
          onApply={onApplyCell}
          onClear={onClearCell}
        />

        <div className="space-y-3">
          <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
            Chord Preview
          </span>
          {activeChord ? (
            <div className="h-52 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
              <ChordDiagram chord={activeChord} theme={theme} />
            </div>
          ) : (
            <div className="h-36 bg-slate-100/50 dark:bg-zinc-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 flex items-center justify-center p-4 text-center">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-600">
                選取拍位或輸入音符以預覽和弦
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-zinc-800 pt-4">
          <button
            type="button"
            onClick={() => setChordOpen(v => !v)}
            className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3 hover:text-indigo-600 dark:hover:text-violet-400 transition-colors"
          >
            Chord Library
            {chordOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {chordOpen && (
            <div className="grid grid-cols-2 gap-2">
              {chordLibrary.map((chord, i) => (
                <button
                  key={`${chord.name}-${i}`}
                  draggable
                  onDragStart={e => e.dataTransfer.setData('chordName', chord.name)}
                  onClick={() => onChordClick(chord)}
                  className="cursor-grab active:cursor-grabbing px-3 py-2.5 bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-slate-600 dark:text-zinc-300 hover:border-indigo-500 dark:hover:border-violet-500 hover:bg-indigo-50 dark:hover:bg-violet-950/20 hover:text-indigo-600 dark:hover:text-violet-400 transition-all shadow-sm"
                >
                  {chord.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default EditInspectorPanel;
