import { useEffect, useMemo, useState } from 'react';
import { findChordVoicings, getVoicingPosition, VoicingPosition } from '../guitar';
import { ChordDefinition, VoicingPositionPreference } from '../types';
import { sameFrets } from '../services/voicingPlan';

export const VOICING_POSITIONS: Array<{ value: VoicingPositionPreference; label: string; range: string }> = [
  { value: 'recommended', label: '推薦', range: '常用指法' },
  { value: 'low', label: '低把位', range: '1–4 格' },
  { value: 'middle', label: '中把位', range: '5–8 格' },
  { value: 'high', label: '高把位', range: '9 格以上' },
];

export const VOICING_POSITION_LABELS: Record<VoicingPosition, string> = {
  low: '低把位',
  middle: '中把位',
  high: '高把位',
};

interface UsePositionedVoicingsOptions {
  symbol: string | null;
  chordLibrary: ChordDefinition[];
  initialPosition?: VoicingPositionPreference;
  preferredFrets?: Array<number | null>;
  limit?: number;
}

export const usePositionedVoicings = ({
  symbol,
  chordLibrary,
  initialPosition = 'recommended',
  preferredFrets,
  limit = 12,
}: UsePositionedVoicingsOptions) => {
  const [position, setPosition] = useState<VoicingPositionPreference>(initialPosition);
  const [voicingIndex, setVoicingIndex] = useState(0);
  const results = useMemo(() => {
    if (!symbol) return null;
    return {
      recommended: findChordVoicings(symbol, chordLibrary, undefined, { limit }),
      low: findChordVoicings(symbol, chordLibrary, undefined, { limit, position: 'low' }),
      middle: findChordVoicings(symbol, chordLibrary, undefined, { limit, position: 'middle' }),
      high: findChordVoicings(symbol, chordLibrary, undefined, { limit, position: 'high' }),
    };
  }, [chordLibrary, limit, symbol]);
  const result = results?.[position] ?? null;
  const shape = result?.shapes[voicingIndex] ?? null;

  useEffect(() => setPosition(initialPosition), [initialPosition, symbol]);
  useEffect(() => {
    const preferredIndex = preferredFrets
      ? result?.shapes.findIndex(candidate => sameFrets(candidate.frets, preferredFrets)) ?? -1
      : -1;
    setVoicingIndex(preferredIndex >= 0 ? preferredIndex : 0);
  }, [position, preferredFrets, result?.shapes, symbol]);

  return {
    position,
    setPosition,
    voicingIndex,
    setVoicingIndex,
    results,
    result,
    shape,
    shapePosition: shape ? getVoicingPosition(shape.frets) : null,
  };
};
