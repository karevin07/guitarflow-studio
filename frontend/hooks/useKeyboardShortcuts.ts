import { useEffect, useCallback } from 'react';
import { TabSection } from '../types';
import { revertPendingTechnique } from '../services/tabNotation';
import { applyNotationAction, NotationAction } from '../services/notationInput';

type Selection = {
  sectionId: string;
  measureIdx: number;
  stringIdx: number;
  colIdx: number;
} | null;

interface UseKeyboardShortcutsOptions {
  viewMode: 'home' | 'edit' | 'preview';
  selection: Selection;
  setSelection: (sel: Selection) => void;
  sections: TabSection[];
  undo: () => void;
  redo: () => void;
  onCellInput: (sectionId: string, measureIdx: number, stringIdx: number, colIdx: number, value: string) => void;
  onCellClear: (sectionId: string, measureIdx: number, stringIdx: number, colIdx: number) => void;
  onOpenHelp?: () => void;
}

export const useKeyboardShortcuts = ({
  viewMode,
  selection,
  setSelection,
  sections,
  undo,
  redo,
  onCellInput,
  onCellClear,
  onOpenHelp,
}: UseKeyboardShortcutsOptions) => {
  const moveCursor = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right' | 'nextMeasure' | 'nextBeat') => {
      if (!selection) return;

      const currentSection = sections.find(s => s.id === selection.sectionId);
      if (!currentSection) return;

      let { measureIdx, stringIdx, colIdx } = selection;
      const maxMeasureIdx = currentSection.measures.length - 1;
      const maxColIdx = 15;

      switch (direction) {
        case 'up':
          stringIdx = Math.max(0, stringIdx - 1);
          break;
        case 'down':
          stringIdx = Math.min(5, stringIdx + 1);
          break;
        case 'left':
          if (colIdx > 0) colIdx--;
          else if (measureIdx > 0) { measureIdx--; colIdx = maxColIdx; }
          break;
        case 'right':
        case 'nextBeat':
          if (colIdx < maxColIdx) colIdx++;
          else if (measureIdx < maxMeasureIdx) { measureIdx++; colIdx = 0; }
          break;
        case 'nextMeasure':
          if (measureIdx < maxMeasureIdx) { measureIdx++; colIdx = 0; }
          break;
      }

      setSelection({ ...selection, measureIdx, stringIdx, colIdx });
    },
    [selection, sections, setSelection]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (viewMode === 'home') return;

      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const tag = document.activeElement?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          onOpenHelp?.();
          return;
        }
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); return; }

      // Skip if focus is in a text input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) return;

      if (viewMode !== 'edit') return;

      if (e.key === 'Escape' && selection) {
        const currentSection = sections.find(s => s.id === selection.sectionId);
        const currentVal = currentSection?.measures[selection.measureIdx]?.[selection.stringIdx]?.[selection.colIdx] ?? '-';
        const reverted = revertPendingTechnique(currentVal);
        if (reverted) {
          e.preventDefault();
          onCellInput(selection.sectionId, selection.measureIdx, selection.stringIdx, selection.colIdx, reverted);
          return;
        }
      }

      if (selection) {
        if (e.key === 'ArrowUp') { e.preventDefault(); moveCursor('up'); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); moveCursor('down'); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); moveCursor('left'); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); moveCursor('right'); return; }
        if (e.key === 'Tab') { e.preventDefault(); moveCursor('nextBeat'); return; }
        if (e.key === 'Enter') { e.preventDefault(); moveCursor('nextMeasure'); return; }
      }

      if (!selection) return;

      const currentSection = sections.find(s => s.id === selection.sectionId);
      if (!currentSection) return;
      const currentVal = currentSection.measures[selection.measureIdx]?.[selection.stringIdx]?.[selection.colIdx] ?? '-';

      const key = e.key.toLowerCase();
      const isNum = e.key >= '0' && e.key <= '9';
      const isSlide = key === 's' || e.key === '/';
      const isTechnique = key === 'h' || key === 'p' || key === 'b';

      if (key === 'x') {
        e.preventDefault();
        const next = applyNotationAction(currentVal, 'mute');
        if (next) onCellInput(selection.sectionId, selection.measureIdx, selection.stringIdx, selection.colIdx, next);
        return;
      }

      if (isTechnique) {
        e.preventDefault();
        const action: NotationAction = key === 'h' ? 'hammer' : key === 'p' ? 'pull' : 'bend';
        const next = applyNotationAction(currentVal, action);
        if (next) onCellInput(selection.sectionId, selection.measureIdx, selection.stringIdx, selection.colIdx, next);
        return;
      }

      if (isSlide) {
        e.preventDefault();
        const action: NotationAction = key === 's' ? 'slide-up' : 'slide-down';
        const next = applyNotationAction(currentVal, action);
        if (next) onCellInput(selection.sectionId, selection.measureIdx, selection.stringIdx, selection.colIdx, next);
        return;
      }

      if (isNum) {
        let newVal = e.key;

        if (/^(\d+)([hpb])$/.test(currentVal)) {
          newVal = currentVal + e.key;
        } else if (currentVal && currentVal !== '-' && currentVal !== '·' && /^\d+$/.test(currentVal)) {
          const combined = parseInt(currentVal + e.key, 10);
          if (combined <= 24 && currentVal.length < 2) newVal = combined.toString();
        }

        onCellInput(selection.sectionId, selection.measureIdx, selection.stringIdx, selection.colIdx, newVal);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        onCellClear(selection.sectionId, selection.measureIdx, selection.stringIdx, selection.colIdx);
      }
    },
    [viewMode, selection, sections, undo, redo, moveCursor, onCellInput, onCellClear, onOpenHelp]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
