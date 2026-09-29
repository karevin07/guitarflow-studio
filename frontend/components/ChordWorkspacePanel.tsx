import React, { useMemo } from 'react';
import { BookmarkCheck, ChevronLeft, ChevronRight, LockKeyhole, Music2, RotateCcw, X } from 'lucide-react';
import { ChordDefinition, SongVoicingPreference } from '../types';
import { formatPitch, getChordPitchClasses, parseChord } from '../music-theory';
import { usePositionedVoicings, VOICING_POSITION_LABELS, VOICING_POSITIONS } from '../hooks/usePositionedVoicings';
import { applicableLockedShape, sameFrets } from '../services/voicingPlan';
import ChordDiagram from './ChordDiagram';


const TAG_LABELS: Record<string, string> = { open: '開放', barre: '封閉', jazz: '爵士', shell: '骨架', triad: '三和弦' };
interface ChordWorkspacePanelProps {
  symbol: string | null;
  sourceSymbol?: string | null;
  chordLibrary: ChordDefinition[];
  theme: 'light' | 'dark';
  preference?: SongVoicingPreference;
  onPreferenceChange?: (preference: SongVoicingPreference | null) => void;
  onClose?: () => void;
  compact?: boolean;
}

const ChordWorkspacePanel: React.FC<ChordWorkspacePanelProps> = ({
  symbol,
  sourceSymbol,
  chordLibrary,
  theme,
  preference,
  onPreferenceChange,
  onClose,
  compact = false,
}) => {
  const lockedShape = applicableLockedShape(preference, symbol);
  const effectiveLibrary = useMemo(() => {
    if (!lockedShape || !symbol) return chordLibrary;
    const alreadyIncluded = chordLibrary.some(chord => chord.name === symbol && sameFrets(chord.frets, lockedShape.frets));
    return alreadyIncluded ? chordLibrary : [{ ...lockedShape, name: symbol }, ...chordLibrary];
  }, [chordLibrary, lockedShape, symbol]);
  const {
    position,
    setPosition,
    voicingIndex,
    setVoicingIndex,
    results,
    result,
    shape,
    shapePosition,
  } = usePositionedVoicings({
    symbol,
    chordLibrary: effectiveLibrary,
    initialPosition: preference?.position ?? 'recommended',
    preferredFrets: lockedShape?.frets,
    limit: 8,
  });
  const parsed = symbol ? parseChord(symbol) : null;
  const notes = parsed
    ? getChordPitchClasses(parsed).map(pitch => formatPitch(pitch, parsed.accidentalPreference))
    : [];
  const difficulty = !shape || shape.score >= 125 ? '好上手' : shape.score >= 105 ? '中等' : '進階';
  const fretText = shape?.frets.map(fret => fret ?? 'X').reverse().join(' ') ?? '';
  const isLocked = Boolean(lockedShape && shape && sameFrets(lockedShape.frets, shape.frets));
  const applyPosition = () => onPreferenceChange?.({ position });
  const lockShape = () => {
    if (!shape || !symbol) return;
    onPreferenceChange?.({
      position,
      lockedShape: {
        symbol,
        name: symbol,
        frets: [...shape.frets],
        fingers: shape.fingers,
        barres: shape.barres,
      },
    });
  };
  const voicingLabel = (index: number) => {
    const candidate = result?.shapes[index];
    if (!candidate) return `按法 ${index + 1}`;
    const kinds = [['open', '開放'], ['barre', '封閉'], ['triad', '三和弦']] as const;
    const kind = kinds.find(([tag]) => candidate.tags.includes(tag));
    if (kind) {
      const occurrence = result?.shapes
        .slice(0, index)
        .filter(item => item.tags.includes(kind[0])).length ?? 0;
      return occurrence === 0 ? kind[1] : `${kind[1]} ${occurrence + 1}`;
    }
    const pressed = candidate.frets.filter((fret): fret is number => fret !== null && fret > 0);
    return pressed.length > 0 ? `第 ${Math.min(...pressed)} 格` : `按法 ${index + 1}`;
  };

  return (
    <div className={`flex h-full flex-col ${compact ? 'px-5 pb-6' : 'p-6'}`}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-zinc-800">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
            目前和弦
          </span>
          <h2 className="mt-1 font-mono text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
            {symbol ?? 'Select a chord'}
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Close chord panel"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {shape && symbol ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-zinc-800/70">
            {VOICING_POSITIONS.map(option => {
              const count = results?.[option.value]?.shapes.length ?? 0;
              return <button key={option.value} type="button" onClick={() => setPosition(option.value)} disabled={count === 0} className={`rounded-xl px-2.5 py-2 text-left transition-colors ${position === option.value ? 'bg-white text-slate-950 shadow-sm dark:bg-zinc-700 dark:text-white' : 'text-slate-500 hover:text-indigo-600 disabled:opacity-30 dark:text-zinc-400 dark:hover:text-violet-300'}`}><span className="flex items-center justify-between text-[11px] font-semibold"><span>{option.label}</span><span className="font-mono text-[11px] opacity-60">{count}</span></span><span className="mt-0.5 block text-[11px] opacity-60">{option.range}</span></button>;
            })}
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center py-4">
            <ChordDiagram
              chord={{ name: symbol, frets: shape.frets, fingers: shape.fingers, barres: shape.barres }}
              size={compact ? 180 : 210}
              theme={theme}
              variant="bare"
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-100/80 px-4 py-3 dark:bg-zinc-800/60">
              <div className="font-mono text-sm font-semibold tracking-[0.16em] text-slate-800 dark:text-zinc-100">
                {fretText}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                <span>{difficulty}</span>
                {shapePosition && <><span aria-hidden="true">·</span><span>{VOICING_POSITION_LABELS[shapePosition]}</span></>}
                {shape.tags.filter(tag => tag !== 'easy').map(tag => <span key={tag}>· {TAG_LABELS[tag] ?? tag}</span>)}
              </div>
            </div>

            {result.shapes.length > 1 && (
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-500">其他按法</div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {result.shapes.map((candidate, index) => (
                    <button
                      key={`${candidate.frets.join('-')}-${index}`}
                      type="button"
                      onClick={() => setVoicingIndex(index)}
                      className={`shrink-0 rounded-lg px-3 py-2 text-left transition-colors ${voicingIndex === index ? 'bg-slate-950 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'bg-slate-100 text-slate-600 hover:text-indigo-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:text-violet-400'}`}
                    >
                      <div className="text-[11px] font-semibold">{voicingLabel(index)}</div>
                      <div className={`mt-0.5 font-mono text-[11px] ${voicingIndex === index ? 'text-slate-300 dark:text-zinc-500' : 'text-slate-400 dark:text-zinc-500'}`}>{candidate.frets.map(fret => fret ?? 'X').reverse().join(' ')}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setVoicingIndex(index => Math.max(0, index - 1))}
                disabled={voicingIndex === 0}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-25 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-violet-700 dark:hover:text-violet-400"
                aria-label="上一個按法"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="text-center">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-500">
                  Voicing
                </div>
                <div className="mt-0.5 text-sm font-semibold text-slate-700 dark:text-zinc-200">
                  {voicingIndex + 1} / {result.shapes.length}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVoicingIndex(index => Math.min(result.shapes.length - 1, index + 1))}
                disabled={voicingIndex >= result.shapes.length - 1}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-25 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-violet-700 dark:hover:text-violet-400"
                aria-label="下一個按法"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {sourceSymbol && onPreferenceChange && (
              <div className="grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-4 dark:border-zinc-800">
                <button type="button" onClick={applyPosition} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-violet-700 dark:hover:text-violet-300"><BookmarkCheck size={14} />套用此把位</button>
                <button type="button" onClick={lockShape} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-semibold transition-colors ${isLocked ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-950 text-white hover:bg-indigo-600 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-violet-300'}`}><LockKeyhole size={14} />{isLocked ? '已固定此指法' : '固定此指法'}</button>
                {preference && <button type="button" onClick={() => onPreferenceChange(null)} className="col-span-2 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"><RotateCcw size={13} />恢復自動推薦</button>}
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-slate-200/80 pt-4 dark:border-zinc-800">
              <Music2 size={14} className="text-indigo-500 dark:text-violet-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">組成音</span>
              <span className="ml-auto font-mono text-xs font-semibold text-slate-700 dark:text-zinc-200">{notes.join(' · ')}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500">
            <Music2 size={24} />
          </div>
          <p className="max-w-[220px] text-sm leading-6 text-slate-500 dark:text-zinc-400">
            Choose a chord in the score to see its fingering and alternatives.
          </p>
        </div>
      )}
    </div>
  );
};

export default ChordWorkspacePanel;
