export const TIME_SIGNATURE_OPTIONS: [number, number][] = [
  [4, 4],
  [3, 4],
  [2, 4],
  [6, 8],
  [12, 8],
];

export const DEFAULT_TIME_SIGNATURE: [number, number] = [4, 4];

/** Tempo used when a song has no saved BPM. */
export const DEFAULT_BPM = 120;
export const MIN_BPM = 40;
export const MAX_BPM = 240;

export const formatTimeSignature = (ts: [number, number]) => `${ts[0]}/${ts[1]}`;
