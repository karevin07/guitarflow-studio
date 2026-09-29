/** Duration of one column in ms at the given BPM (4 sixteenths per beat). */
export const colIndexToMs = (colIndex: number, bpm: number) =>
  colIndex * ((60 / bpm) / 4) * 1000;

export const formatPlaybackMs = (ms: number) => {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};
