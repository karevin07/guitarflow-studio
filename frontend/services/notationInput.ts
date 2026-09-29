export type NotationAction = 'mute' | 'hammer' | 'pull' | 'bend' | 'slide-up' | 'slide-down';

const SLIDE_CHARS = { 'slide-up': 's', 'slide-down': '/' } as const;

/** Apply a toolbar / shortcut notation action to the current cell value. */
export const applyNotationAction = (currentVal: string, action: NotationAction): string | null => {
  switch (action) {
    case 'mute':
      return 'x';
    case 'hammer':
      return /^\d+$/.test(currentVal) ? `${currentVal}h` : null;
    case 'pull':
      return /^\d+$/.test(currentVal) ? `${currentVal}p` : null;
    case 'bend':
      return /^\d+$/.test(currentVal) ? `${currentVal}b` : null;
    case 'slide-up':
    case 'slide-down':
      return applySlide(currentVal, SLIDE_CHARS[action]);
    default:
      return null;
  }
};

const applySlide = (currentVal: string, key: 's' | '/'): string => {
  if (
    currentVal &&
    currentVal !== '-' &&
    currentVal !== '·' &&
    !Number.isNaN(parseInt(currentVal, 10)) &&
    !currentVal.includes('s') &&
    !currentVal.includes('/')
  ) {
    return currentVal + key;
  }
  return key;
};

export const canApplyNotationAction = (currentVal: string, action: NotationAction): boolean =>
  applyNotationAction(currentVal, action) !== null;


export type CellNoteKind =
  | 'empty'
  | 'mute'
  | 'fret'
  | 'hammer'
  | 'pull'
  | 'bend'
  | 'slide-up'
  | 'slide-down';

export interface CellInspectorModel {
  kind: CellNoteKind;
  fret: number | null;
  targetFret: number | null;
}

export const cellNoteKindNeedsTarget = (kind: CellNoteKind): boolean =>
  kind === 'hammer' || kind === 'pull' || kind === 'bend';

export const parseCellForInspector = (value: string): CellInspectorModel => {
  const v = value.trim();
  if (!v || v === '-' || v === '·') return { kind: 'empty', fret: null, targetFret: null };
  if (v.toLowerCase() === 'x') return { kind: 'mute', fret: null, targetFret: null };

  const hammer = v.match(/^(\d+)h(\d+)?$/i);
  if (hammer) {
    return {
      kind: 'hammer',
      fret: parseInt(hammer[1], 10),
      targetFret: hammer[2] ? parseInt(hammer[2], 10) : null,
    };
  }

  const pull = v.match(/^(\d+)p(\d+)?$/i);
  if (pull) {
    return {
      kind: 'pull',
      fret: parseInt(pull[1], 10),
      targetFret: pull[2] ? parseInt(pull[2], 10) : null,
    };
  }

  const bend = v.match(/^(\d+)b(\d+)?$/i);
  if (bend) {
    return {
      kind: 'bend',
      fret: parseInt(bend[1], 10),
      targetFret: bend[2] ? parseInt(bend[2], 10) : null,
    };
  }

  const slideUp = v.match(/^(\d+)s$/i);
  if (slideUp) return { kind: 'slide-up', fret: parseInt(slideUp[1], 10), targetFret: null };

  const slideDown = v.match(/^(\d+)\/$/);
  if (slideDown) return { kind: 'slide-down', fret: parseInt(slideDown[1], 10), targetFret: null };

  if (/^\d+$/.test(v)) return { kind: 'fret', fret: parseInt(v, 10), targetFret: null };

  if (v === 's') return { kind: 'slide-up', fret: null, targetFret: null };
  if (v === '/') return { kind: 'slide-down', fret: null, targetFret: null };

  return { kind: 'empty', fret: null, targetFret: null };
};

export const buildCellFromInspector = (model: CellInspectorModel): string => {
  switch (model.kind) {
    case 'empty':
      return '-';
    case 'mute':
      return 'x';
    case 'fret':
      return model.fret != null ? String(model.fret) : '-';
    case 'hammer':
      if (model.fret == null) return '-';
      return model.targetFret != null ? `${model.fret}h${model.targetFret}` : `${model.fret}h`;
    case 'pull':
      if (model.fret == null) return '-';
      return model.targetFret != null ? `${model.fret}p${model.targetFret}` : `${model.fret}p`;
    case 'bend':
      if (model.fret == null) return '-';
      return model.targetFret != null ? `${model.fret}b${model.targetFret}` : `${model.fret}b`;
    case 'slide-up':
      return model.fret != null ? `${model.fret}s` : 's';
    case 'slide-down':
      return model.fret != null ? `${model.fret}/` : '/';
    default:
      return '-';
  }
};
