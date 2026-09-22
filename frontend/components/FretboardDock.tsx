import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Fretboard from './Fretboard';
import { TechniqueInputHint } from '../services/tabNotation';

const FRETBOARD_DOCK_KEY = 'guitarflow-fretboard-open';

const loadDockOpen = (): boolean => {
  const stored = localStorage.getItem(FRETBOARD_DOCK_KEY);
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerHeight >= 900 : false;
};

interface EditorSelection {
  measureIdx: number;
  stringIdx: number;
  colIdx: number;
}

interface FretboardDockProps {
  selection: EditorSelection | null;
  techniqueHint: TechniqueInputHint | null;
  onNoteClick: (stringIdx: number, fret: number) => void;
}

const FretboardDock: React.FC<FretboardDockProps> = ({ selection, techniqueHint, onNoteClick }) => {
  const [open, setOpen] = useState(loadDockOpen);

  useEffect(() => {
    localStorage.setItem(FRETBOARD_DOCK_KEY, String(open));
  }, [open]);

  return (
    <div className="border-t border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/50 backdrop-blur-md shrink-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-slate-50/80 dark:hover:bg-zinc-900/60 transition-colors"
      >
        <div>
          <h4 className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            {open && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
            Fretboard
          </h4>
          {!open && selection && (
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
              M{selection.measureIdx + 1} · S{selection.stringIdx + 1} · Col {selection.colIdx + 1}
            </p>
          )}
        </div>
        {open ? (
          <ChevronDown size={16} className="text-slate-400" />
        ) : (
          <ChevronUp size={16} className="text-slate-400" />
        )}
      </button>

      {open && (
        <div className="px-6 pb-5 animate-in slide-in-from-bottom-1 duration-200">
          {!selection ? (
            <p className="text-xs text-slate-400 dark:text-zinc-500 py-4 text-center">
              點選樂譜格子以使用指板輸入
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 mb-3">
                <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                  點選品位寫入目前選取的格子
                </p>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-violet-400 uppercase tracking-widest">
                  M{selection.measureIdx + 1} · S{selection.stringIdx + 1} · Col {selection.colIdx + 1}
                </span>
              </div>
              {techniqueHint && (
                <p
                  className={`text-[10px] font-semibold mb-3 ${
                    techniqueHint.kind === 'bend'
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-indigo-600 dark:text-violet-400'
                  }`}
                >
                  {techniqueHint.message}
                  <span className="text-slate-400 dark:text-zinc-500 font-normal ml-2">（Esc 取消）</span>
                </p>
              )}
              <Fretboard
                selectedString={selection.stringIdx}
                selectedCol={selection.colIdx}
                onNoteClick={onNoteClick}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FretboardDock;
