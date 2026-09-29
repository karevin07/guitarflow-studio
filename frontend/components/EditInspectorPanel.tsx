import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
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
  /** Chord names used in the song, most frequent first. */
  songChords: string[];
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
  songChords,
  theme,
  onApplyCell,
  onClearCell,
  onChordClick,
}) => {
  const [chordOpen, setChordOpen] = useState(true);
  const [query, setQuery] = useState('');
  const inSong = useMemo(
    () => songChords.flatMap(name => chordLibrary.find(chord => chord.name === name) ?? []),
    [songChords, chordLibrary]
  );
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return chordLibrary.filter(chord => chord.name.toLowerCase().startsWith(needle)).slice(0, 24);
  }, [query, chordLibrary]);
  const chordButton = (chord: ChordDefinition, key: string) => (
    <button
      key={key}
      type="button"
      draggable
      onDragStart={e => e.dataTransfer.setData('chordName', chord.name)}
      onClick={() => onChordClick(chord)}
      title="點一下寫入目前的拍位，也可以拖曳到譜上"
      className="h-10 cursor-grab rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-violet-500 dark:hover:bg-violet-950/20 dark:hover:text-violet-400"
    >
      {chord.name}
    </button>
  );

  return (
    <aside className="hidden w-80 flex-col overflow-hidden border-l border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 transition-colors duration-250 xl:flex">
      <div className="p-6 border-b border-slate-200 dark:border-zinc-800/80">
        <h3 className="text-xs font-bold text-slate-500 dark:text-zinc-400">音符與和弦</h3>
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
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">和弦預覽</span>
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
            aria-expanded={chordOpen}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-500 dark:text-zinc-400 mb-3 hover:text-indigo-600 dark:hover:text-violet-400 transition-colors"
          >
            寫入和弦
            {chordOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {chordOpen && (
            <div className="space-y-4">
              <label className="relative block">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="搜尋和弦，例如 Am7"
                  aria-label="搜尋和弦"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900"
                />
              </label>
              {query.trim() ? (
                results.length > 0
                  ? <div className="grid grid-cols-3 gap-2">{results.map((chord, i) => chordButton(chord, `r-${chord.name}-${i}`))}</div>
                  : <p className="text-xs text-slate-400">找不到「{query}」開頭的和弦</p>
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500">這首歌用到的和弦</div>
                  {inSong.length > 0
                    ? <div className="grid grid-cols-3 gap-2">{inSong.map((chord, i) => chordButton(chord, `s-${chord.name}-${i}`))}</div>
                    : <p className="text-xs text-slate-400">還沒有和弦，用上面的搜尋找一個。</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default EditInspectorPanel;
