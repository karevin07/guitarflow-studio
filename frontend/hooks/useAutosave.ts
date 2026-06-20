import { useEffect } from 'react';

interface UseAutosaveOptions {
  enabled: boolean;
  delayMs: number;
  isDirty: boolean;
  canSave: boolean;
  onSave: () => void;
}

export const useAutosave = ({
  enabled,
  delayMs,
  isDirty,
  canSave,
  onSave,
}: UseAutosaveOptions) => {
  useEffect(() => {
    if (!enabled || !isDirty || !canSave) return;
    const timer = setTimeout(onSave, delayMs);
    return () => clearTimeout(timer);
  }, [enabled, delayMs, isDirty, canSave, onSave]);
};
