import { PitchClass } from '../music-theory';

export interface GuitarTuning {
  name: string;
  /** String order follows the app model: high e to low E. */
  strings: readonly PitchClass[];
}

export const STANDARD_TUNING: GuitarTuning = {
  name: 'Standard',
  strings: [4, 11, 7, 2, 9, 4],
};
