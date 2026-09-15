import React from 'react';
import { Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import EditScoreView from './EditScoreView';
import EditInspectorPanel from './EditInspectorPanel';
import FretboardDock from './FretboardDock';
import { TabSection, ChordDefinition } from '../types';
import { TechniqueInputHint } from '../services/tabNotation';

interface EditorSelection {
  sectionId: string;
  measureIdx: number;
  stringIdx: number;
  colIdx: number;
}

interface PlayState {
  sectionIdx: number;
  measureIdx: number;
  colIdx: number;
}

interface EditViewProps {
  sections: TabSection[];
  activeSectionId: string;
  selection: EditorSelection | null;
  playState: PlayState | null;
  theme: 'light' | 'dark';
  techniqueHint: TechniqueInputHint | null;
  activeChord: ChordDefinition | null;
  chordLibrary: ChordDefinition[];
  canUndo: boolean;
  canRedo: boolean;
  onSetActiveSection: (id: string) => void;
  onAddSection: () => void;
  onMoveSection: (id: string, direction: 'up' | 'down') => void;
  onDeleteSection: (id: string) => void;
  onUpdateSectionTitle: (title: string) => void;
  onSetTimeSignature: (ts: [number, number]) => void;
  onSetCapo: (capo: number) => void;
  onAddMeasure: () => void;
  onSetSelection: (sel: EditorSelection) => void;
  onChordNameChange: (measureIdx: number, colIdx: number, name: string) => void;
  onLyricChange: (measureIdx: number, colIdx: number, text: string) => void;
  onDeleteMeasure: (measureIdx: number) => void;
  onCopyMeasure: (measureIdx: number) => void;
  onClearColumn: (measureIdx: number, colIdx: number) => void;
  onDropChord: (measureIdx: number, colIdx: number, chordName: string) => void;
  onCellInput: (
    sectionId: string,
    measureIdx: number,
    stringIdx: number,
    colIdx: number,
    value: string
  ) => void;
  onCellClear: (
    sectionId: string,
    measureIdx: number,
    stringIdx: number,
    colIdx: number
  ) => void;
  onChordInput: (chord: ChordDefinition) => void;
  onUndo: () => void;
  onRedo: () => void;
  onOpenHelp: () => void;
}

const EditView: React.FC<EditViewProps> = ({
  sections,
  activeSectionId,
  selection,
  playState,
  theme,
  techniqueHint,
  activeChord,
  chordLibrary,
  canUndo,
  canRedo,
  onSetActiveSection,
  onAddSection,
  onMoveSection,
  onDeleteSection,
  onUpdateSectionTitle,
  onSetTimeSignature,
  onSetCapo,
  onAddMeasure,
  onSetSelection,
  onChordNameChange,
  onLyricChange,
  onDeleteMeasure,
  onCopyMeasure,
  onClearColumn,
  onDropChord,
  onCellInput,
  onCellClear,
  onChordInput,
  onUndo,
  onRedo,
  onOpenHelp,
}) => {
  const currentSection = sections.find(s => s.id === activeSectionId);

  const cellValue =
    selection && currentSection
      ? currentSection.measures[selection.measureIdx]?.[selection.stringIdx]?.[selection.colIdx] ?? '-'
      : '-';

  return (
    <>
      <aside className="hidden w-60 flex-col border-r border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 transition-colors duration-250 xl:flex">
        <div className="p-6 border-b border-slate-200 dark:border-zinc-800/80 flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
            Sections
          </h3>
          <button
            type="button"
            onClick={onAddSection}
            className="p-1 text-indigo-600 dark:text-violet-400 hover:bg-indigo-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sections.map((sec, idx) => (
            <div
              key={sec.id}
              className={`group flex items-center gap-1 rounded-xl border transition-all ${
                activeSectionId === sec.id
                  ? 'border-indigo-500 bg-indigo-50/70 dark:border-violet-500 dark:bg-violet-500/10 shadow-md'
                  : 'border-transparent hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <button
                type="button"
                onClick={() => onSetActiveSection(sec.id)}
                className={`flex-1 text-left px-4 py-3 text-sm font-bold transition-all ${
                  activeSectionId === sec.id
                    ? 'text-indigo-600 dark:text-violet-400'
                    : 'text-slate-500 dark:text-zinc-400'
                }`}
              >
                {sec.title}
              </button>
              <div className="flex flex-col pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onMoveSection(sec.id, 'up');
                  }}
                  disabled={idx === 0}
                  className="p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-violet-400 disabled:opacity-30"
                  title="Move up"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onMoveSection(sec.id, 'down');
                  }}
                  disabled={idx === sections.length - 1}
                  className="p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-violet-400 disabled:opacity-30"
                  title="Move down"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  if (sections.length <= 1) return;
                  if (confirm(`Delete section "${sec.title}"?`)) onDeleteSection(sec.id);
                }}
                disabled={sections.length <= 1}
                className="p-2 mr-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 disabled:opacity-30 transition-all"
                title="Delete section"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {currentSection && (
          <>
            <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950 xl:hidden">
              {sections.map(section => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSetActiveSection(section.id)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    activeSectionId === section.id
                      ? 'bg-slate-950 text-white dark:bg-zinc-100 dark:text-zinc-950'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
                  }`}
                >
                  {section.title}
                </button>
              ))}
              <button
                type="button"
                onClick={onAddSection}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 dark:border-zinc-800 dark:text-zinc-400"
                aria-label="Add section"
              >
                <Plus size={15} />
              </button>
            </div>
            <EditScoreView
              section={currentSection}
              sections={sections}
              selection={selection}
              playState={playState}
              theme={theme}
              techniqueHint={techniqueHint}
              onUpdateTitle={onUpdateSectionTitle}
              onSetTimeSignature={onSetTimeSignature}
              onSetCapo={onSetCapo}
              onAddMeasure={onAddMeasure}
              onSetSelection={onSetSelection}
              onChordNameChange={onChordNameChange}
              onLyricChange={onLyricChange}
              onDeleteMeasure={onDeleteMeasure}
              onCopyMeasure={onCopyMeasure}
              onClearColumn={onClearColumn}
              onDropChord={onDropChord}
              onCellInput={onCellInput}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={onUndo}
              onRedo={onRedo}
              onOpenHelp={onOpenHelp}
            />
            <FretboardDock
              selection={selection}
              techniqueHint={techniqueHint}
              onNoteClick={(stringIdx, fret) => {
                if (!selection) return;
                onCellInput(selection.sectionId, selection.measureIdx, stringIdx, selection.colIdx, fret.toString());
              }}
            />
          </>
        )}
      </div>

      <EditInspectorPanel
        selection={selection}
        cellValue={cellValue}
        techniqueHint={techniqueHint}
        activeChord={activeChord}
        chordLibrary={chordLibrary}
        theme={theme}
        onApplyCell={value => {
          if (!selection) return;
          onCellInput(selection.sectionId, selection.measureIdx, selection.stringIdx, selection.colIdx, value);
        }}
        onClearCell={() => {
          if (!selection) return;
          onCellClear(selection.sectionId, selection.measureIdx, selection.stringIdx, selection.colIdx);
        }}
        onChordClick={onChordInput}
      />
    </>
  );
};

export default EditView;
