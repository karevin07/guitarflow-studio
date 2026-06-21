export const PRACTICE_ZOOM_LEVELS = [80, 100, 125, 150] as const;
export type PracticeZoom = (typeof PRACTICE_ZOOM_LEVELS)[number];

export const DEFAULT_PRACTICE_ZOOM: PracticeZoom = 100;
export const PRACTICE_ZOOM_STORAGE_KEY = 'guitarflow-practice-zoom';

export const TIME_SIGNATURE_OPTIONS: [number, number][] = [
  [4, 4],
  [3, 4],
  [2, 4],
  [6, 8],
  [12, 8],
];

export const DEFAULT_TIME_SIGNATURE: [number, number] = [4, 4];

export const formatTimeSignature = (ts: [number, number]) => `${ts[0]}/${ts[1]}`;
