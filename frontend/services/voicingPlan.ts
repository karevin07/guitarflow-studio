import { ChordDefinition, SongVoicingPlan, SongVoicingPreference, VoicingPositionPreference } from '../types';
import { findChordVoicings } from '../guitar';

const POSITIONS = new Set<VoicingPositionPreference>(['recommended', 'low', 'middle', 'high']);

const isFret = (value: unknown): value is number | null =>
  value === null || (Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 24);

const parseLockedShape = (value: unknown): SongVoicingPreference['lockedShape'] | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const shape = value as Record<string, unknown>;
  if (typeof shape.symbol !== 'string' || !shape.symbol.trim()) return undefined;
  if (!Array.isArray(shape.frets) || shape.frets.length !== 6 || !shape.frets.every(isFret)) return undefined;
  const fingers = Array.isArray(shape.fingers)
    ? shape.fingers.filter((finger): finger is number => Number.isInteger(finger) && Number(finger) >= 0 && Number(finger) <= 4)
    : undefined;
  const barres = Array.isArray(shape.barres)
    ? shape.barres.filter((barre): barre is NonNullable<ChordDefinition['barres']>[number] => {
      if (!barre || typeof barre !== 'object') return false;
      const value = barre as Record<string, unknown>;
      return Number.isInteger(value.fret) && Number(value.fret) >= 0 && Number(value.fret) <= 24
        && Number.isInteger(value.fromString) && Number(value.fromString) >= 1 && Number(value.fromString) <= 6
        && Number.isInteger(value.toString) && Number(value.toString) >= 1 && Number(value.toString) <= 6;
    })
    : undefined;
  return {
    symbol: shape.symbol.trim(),
    name: shape.symbol.trim(),
    frets: [...shape.frets] as Array<number | null>,
    ...(fingers?.length ? { fingers } : {}),
    ...(barres?.length ? { barres } : {}),
  };
};

export const parseVoicingPlan = (value: unknown): SongVoicingPlan => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const plan: SongVoicingPlan = {};
  Object.entries(value as Record<string, unknown>).forEach(([symbol, rawPreference]) => {
    if (!symbol.trim() || !rawPreference || typeof rawPreference !== 'object' || Array.isArray(rawPreference)) return;
    const preference = rawPreference as Record<string, unknown>;
    if (typeof preference.position !== 'string' || !POSITIONS.has(preference.position as VoicingPositionPreference)) return;
    const lockedShape = parseLockedShape(preference.lockedShape);
    plan[symbol] = {
      position: preference.position as VoicingPositionPreference,
      ...(lockedShape ? { lockedShape } : {}),
    };
  });
  return plan;
};

export const sameFrets = (left: Array<number | null>, right: Array<number | null>): boolean =>
  left.length === right.length && left.every((fret, index) => fret === right[index]);

export const applicableLockedShape = (
  preference: SongVoicingPreference | undefined,
  effectiveSymbol: string | null
) => preference?.lockedShape && preference.lockedShape.symbol === effectiveSymbol
  ? preference.lockedShape
  : null;

export const resolvePlannedVoicing = (
  sourceSymbol: string,
  effectiveSymbol: string,
  plan: SongVoicingPlan,
  chordLibrary: ChordDefinition[]
): ChordDefinition | null => {
  const preference = plan[sourceSymbol];
  const lockedShape = applicableLockedShape(preference, effectiveSymbol);
  if (lockedShape) return lockedShape;
  const position = preference?.position === 'recommended' ? undefined : preference?.position;
  const shape = findChordVoicings(
    effectiveSymbol,
    chordLibrary,
    undefined,
    { limit: 1, ...(position ? { position } : {}) }
  )?.shapes[0];
  return shape ? {
    name: effectiveSymbol,
    frets: shape.frets,
    fingers: shape.fingers,
    barres: shape.barres,
  } : null;
};
