import { useEffect, useCallback } from 'react';
import { TabSection } from '../types';

type Selection = {
  sectionId: string;
  measureIdx: number;
  stringIdx: number;
  colIdx: number;
} | null;

interface UseKeyboardShortcutsOptions {
  viewMode: 'home' | 'edit' | 'preview' | 'library';
  selection: Selection;
  setSelection: (sel: Selection) => void;
  sections: TabSection[];
  undo: () => void;
  redo: () => void;
  onCellInput: (sectionId: string, measureIdx: number, stringIdx: number, colIdx: number, value: string) => void;
  onCellClear: (sectionId: string, measureIdx: number, stringIdx: number, colIdx: number) => void;
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

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); return; }

      // Skip if focus is in a text input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) return;

      if (selection) {
        if (e.key === 'ArrowUp') { e.preventDefault(); moveCursor('up'); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); moveCursor('down'); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); moveCursor('left'); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); moveCursor('right'); return; }
        if (e.key === 'Tab') { e.preventDefault(); moveCursor('nextBeat'); return; }
        if (e.key === 'Enter') { e.preventDefault(); moveCursor('nextMeasure'); return; }
      }

      if (!selection) return;

      const isNum = e.key >= '0' && e.key <= '9';
      const isSlide = e.key.toLowerCase() === 's' || e.key === '/';

      if (isNum || isSlide) {
        const currentSection = sections.find(s => s.id === selection.sectionId);
        if (!currentSection) return;
        const currentVal = currentSection.measures[selection.measureIdx]?.[selection.stringIdx]?.[selection.colIdx];
        let newVal = e.key;

        if (isSlide) {
          if (
            currentVal &&
            currentVal !== '-' &&
            currentVal !== '·' &&
            !isNaN(parseInt(currentVal, 10)) &&
            !currentVal.includes('s') &&
            !currentVal.includes('/')
          ) {
            newVal = currentVal + e.key.toLowerCase();
          } else {
            newVal = e.key.toLowerCase();
          }
        } else {
          // Smart double-digit: combine if current is a single digit
          if (currentVal && currentVal !== '-' && currentVal !== '·' && /^\d+$/.test(currentVal)) {
            const combined = parseInt(currentVal + e.key, 10);
            if (combined <= 24 && currentVal.length < 2) newVal = combined.toString();
          }
        }

        onCellInput(selection.sectionId, selection.measureIdx, selection.stringIdx, selection.colIdx, newVal);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        onCellClear(selection.sectionId, selection.measureIdx, selection.stringIdx, selection.colIdx);
      }
    },
    [viewMode, selection, sections, undo, redo, moveCursor, onCellInput, onCellClear]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
