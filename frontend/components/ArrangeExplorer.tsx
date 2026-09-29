import React, { useMemo, useState } from 'react';
import { ArrowRight, Target } from 'lucide-react';
import {
  Chord,
  MusicalKey,
  PitchClass,
  analyzeChordForSolo,
  formatChord,
  formatPitch,
  formatScale,
  getScalePitchClasses,
  guideToneMove,
  keyAccidentalPreference,
  keySafeScales,
  scaleAccidentalPreference,
  toPitchClass,
} from '../music-theory';
import { POSITION_WINDOWS, PositionWindowId, pentatonicBoxes } from '../guitar';
import { SectionChordStep } from '../services/progression';
import {
  NoteLabelMode,
  buildChordMarks,
  buildScaleMarks,
  describeFretPosition,
  describeMotion,
  positionsForPitch,
} from '../services/soloGuide';
import { previewSingleNote } from '../services/chordPreview';
import SoloFretboard, { CHORD_LEGEND, FretMarkSwatch, SCALE_LEGEND } from './SoloFretboard';
import { card, segmentButton, segmentGroup } from './arrangeStyles';

export interface ParsedStep extends SectionChordStep {
  chord: Chord | null;
}

interface ArrangeExplorerProps {
  steps: ParsedStep[];
  /** First chord of the following section, used for the last chord's transition. */
  nextSectionStep: ParsedStep | undefined;
  focusIdx: number;
  onFocus: (index: number) => void;
  songKey: MusicalKey;
  capo: number;
}

type ExploreMode = 'chord' | 'scale';
type WindowChoice = PositionWindowId | 'all';

const ROLE_LABEL: Partial<Record<string, string>> = { third: '3 度', seventh: '7 度', root: '根音' };

const ArrangeExplorer: React.FC<ArrangeExplorerProps> = ({ steps, nextSectionStep, focusIdx, onFocus, songKey, capo }) => {
  const [mode, setMode] = useState<ExploreMode>('chord');
  const [windowChoice, setWindowChoice] = useState<WindowChoice>('middle');
  const [labelMode, setLabelMode] = useState<NoteLabelMode>('name');
  const [safeScaleIdx, setSafeScaleIdx] = useState(0);
  const [box, setBox] = useState<number | null>(null);

  const keyPreference = keyAccidentalPreference(songKey);
  const focusStep = steps[Math.min(focusIdx, steps.length - 1)];
  const nextStep = steps[focusIdx + 1] ?? nextSectionStep;
  const analysis = useMemo(() => (focusStep?.chord ? analyzeChordForSolo(focusStep.chord, songKey) : null), [focusStep, songKey]);
  const nextAnalysis = useMemo(() => (nextStep?.chord ? analyzeChordForSolo(nextStep.chord, songKey) : null), [nextStep, songKey]);
  const move = analysis && nextAnalysis ? guideToneMove(analysis, nextAnalysis) : null;

  const safeScales = useMemo(() => keySafeScales(songKey), [songKey]);
  const safeScale = safeScales[Math.min(safeScaleIdx, safeScales.length - 1)];
  const boxes = useMemo(() => (
    safeScale.type === 'majorPentatonic' || safeScale.type === 'minorPentatonic' ? pentatonicBoxes(safeScale.root, safeScale.type) : []
  ), [safeScale]);
  const activeBox = mode === 'scale' ? boxes.find(candidate => candidate.box === box) ?? null : null;

  const windowRange = activeBox
    ? { from: Math.max(0, activeBox.from - 1), to: activeBox.to + 1 }
    : windowChoice === 'all' ? null : POSITION_WINDOWS.find(window => window.id === windowChoice) ?? null;
  const suggestionRange = windowRange ?? { from: 0, to: 12 };

  const chordPreference = analysis ? scaleAccidentalPreference(analysis.scale) : keyPreference;
  const marks = mode === 'chord'
    ? analysis ? buildChordMarks(analysis, labelMode, chordPreference) : Array(12).fill(null)
    : buildScaleMarks(safeScale, labelMode, scaleAccidentalPreference(safeScale));
  const targets = useMemo(() => new Set(mode === 'chord' ? analysis?.targets ?? [] : []), [analysis, mode]);
  const only = useMemo(() => activeBox ? new Set(activeBox.notes.map(note => `${note.stringIndex}:${note.fret}`)) : null, [activeBox]);

  const pitchName = (pitch: PitchClass) => formatPitch(pitch, chordPreference);
  const chordName = (chord: Chord) => formatChord(chord, keyPreference);
  const where = (pitch: PitchClass) => {
    const positions = positionsForPitch(pitch, suggestionRange);
    return positions.length ? positions.map(describeFretPosition).join('、') : '這個把位沒有這個音';
  };
  const namesWithRole = (role: string) => analysis
    ? analysis.roles.flatMap((value, pitch) => value === role ? [pitchName(toPitchClass(pitch))] : [])
    : [];

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1" data-testid="arrange-progression">
        {steps.map((step, index) => {
          const fn = step.chord ? analyzeChordForSolo(step.chord, songKey).function : null;
          const active = mode === 'chord' && index === focusIdx;
          return (
            <button
              key={`${step.measureIdx}:${step.colIdx}`}
              type="button"
              onClick={() => { onFocus(index); setMode('chord'); }}
              disabled={!step.chord}
              className={`flex min-w-14 shrink-0 flex-col items-start rounded-xl border px-3 py-2 text-left transition-colors ${active
                ? 'border-[#4d5bd2] bg-[#eef0fd] dark:border-violet-500 dark:bg-violet-950/40'
                : 'border-[#dedcd4] bg-[#fffefa] hover:border-[#bfc2e8] dark:border-zinc-800 dark:bg-zinc-900'} disabled:opacity-50`}
            >
              <span className="font-mono text-sm font-bold">{step.chord ? chordName(step.chord) : step.effectiveSymbol}</span>
              <span className={`text-[11px] font-semibold ${fn && !fn.diatonic ? 'text-[#8a5a12] dark:text-amber-300' : 'text-[#85877f]'}`}>
                {fn ? fn.secondaryDominant ?? fn.numeral : '無法分析'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className={segmentGroup} role="group" aria-label="看什麼">
          <button type="button" className={segmentButton(mode === 'chord')} onClick={() => setMode('chord')}>這個和弦能用的音</button>
          <button type="button" className={segmentButton(mode === 'scale')} onClick={() => setMode('scale')}>整首歌的音階</button>
        </div>
        <div className={segmentGroup} role="group" aria-label="把位">
          {POSITION_WINDOWS.map(window => (
            <button key={window.id} type="button" className={segmentButton(windowChoice === window.id && !activeBox)} onClick={() => { setWindowChoice(window.id); setBox(null); }}>
              {window.label.replace('（開放）', '')}
            </button>
          ))}
          <button type="button" className={segmentButton(windowChoice === 'all' && !activeBox)} onClick={() => { setWindowChoice('all'); setBox(null); }}>整個指板</button>
        </div>
        <div className={`${segmentGroup} ml-auto`} role="group" aria-label="標示">
          <button type="button" className={segmentButton(labelMode === 'name')} onClick={() => setLabelMode('name')}>音名</button>
          <button type="button" className={segmentButton(labelMode === 'degree')} onClick={() => setLabelMode('degree')}>級數</button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        {mode === 'chord' && analysis && focusStep?.chord ? (
          <article className={`${card} space-y-4 p-5`} data-testid="arrange-suggestions">
            <header>
              <div className="flex items-baseline gap-3">
                <h3 className="font-mono text-3xl font-bold">{chordName(focusStep.chord)}</h3>
                <span className="text-sm font-semibold text-[#85877f]">{analysis.function.secondaryDominant ?? analysis.function.numeral}</span>
              </div>
              <p className="mt-1 text-xs text-[#6e716b] dark:text-zinc-400">用 {formatScale(analysis.scale.root, analysis.scale.type, chordPreference)}</p>
              {analysis.scale.reason && <p className="mt-2 rounded-lg bg-[#fbf1dc] px-3 py-2 text-xs text-[#8a5a12] dark:bg-amber-950/50 dark:text-amber-200">{analysis.scale.reason}</p>}
            </header>

            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-[#171a18] dark:text-zinc-100"><Target size={13} className="text-[#e0a526]" />和弦一進來，彈這些最穩</div>
              <ul className="space-y-1.5">
                {analysis.targets.map(pitch => (
                  <li key={pitch} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                    <span className="rounded-md bg-[#2b6c59] px-2 py-0.5 font-mono font-bold text-white dark:bg-emerald-500 dark:text-zinc-950">{pitchName(pitch)}</span>
                    <span className="text-[#85877f]">{ROLE_LABEL[analysis.roles[pitch]] ?? ''}</span>
                    <span className="text-[#6e716b] dark:text-zinc-400">{where(pitch)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
              {namesWithRole('tension').length > 0 && <><dt className="font-semibold text-[#8a5a12] dark:text-amber-300">可以用</dt><dd>{namesWithRole('tension').join('、')}</dd></>}
              {namesWithRole('passing').length > 0 && <><dt className="font-semibold text-[#85877f]">小心用</dt><dd className="text-[#6e716b] dark:text-zinc-400">{namesWithRole('passing').join('、')}（放在弱拍、快速帶過）</dd></>}
              {analysis.bass !== undefined && <><dt className="font-semibold text-[#85877f]">低音</dt><dd className="text-[#6e716b] dark:text-zinc-400">{pitchName(analysis.bass)}，可以彈成低音線</dd></>}
            </dl>

            <div className="border-t border-[#efede7] pt-4 dark:border-zinc-800">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold"><ArrowRight size={13} className="text-[#4d5bd2]" />接到下一個和弦</div>
              {move && nextStep?.chord ? (
                <p className="text-xs text-[#6e716b] dark:text-zinc-400">
                  {chordName(focusStep.chord)} → {chordName(nextStep.chord)}：<span className="font-mono font-bold text-[#171a18] dark:text-zinc-100">{pitchName(move.from)} → {pitchName(move.to)}</span>，{describeMotion(move.semitones)}
                </p>
              ) : (
                <p className="text-xs text-[#6e716b] dark:text-zinc-400">最後一個和弦，停在 {pitchName(analysis.chord.root)} 收尾。</p>
              )}
            </div>
          </article>
        ) : (
          <article className={`${card} space-y-4 p-5`} data-testid="arrange-scale-card">
            <div>
              <h3 className="text-lg font-bold">整首歌都能用的音</h3>
              <p className="mt-1 text-xs text-[#6e716b] dark:text-zinc-400">不管哪個和弦，彈這些音都不會錯。</p>
            </div>
            <div className="flex flex-col gap-2">
              {safeScales.map((scale, index) => (
                <button key={`${scale.root}:${scale.type}`} type="button" onClick={() => { setSafeScaleIdx(index); setBox(null); }} className={`rounded-xl border px-3 py-2 text-left text-xs ${index === safeScaleIdx ? 'border-[#4d5bd2] bg-[#eef0fd] dark:border-violet-500 dark:bg-violet-950/40' : 'border-[#dedcd4] dark:border-zinc-700'}`}>
                  <span className="font-bold">{formatScale(scale.root, scale.type, keyPreference)}</span>
                  <span className="ml-2 font-mono text-[#85877f]">{getScalePitchClasses(scale.root, scale.type).map(pitch => formatPitch(pitch, scaleAccidentalPreference(scale))).join(' ')}</span>
                  {scale.reason && <span className="mt-0.5 block text-[11px] text-[#85877f]">{scale.reason}</span>}
                </button>
              ))}
            </div>
            {boxes.length > 0 && (
              <div>
                <div className="mb-2 text-[11px] font-bold">五聲音階指型</div>
                <div className="flex flex-wrap gap-1.5">
                  {boxes.map(candidate => (
                    <button key={candidate.box} type="button" onClick={() => setBox(candidate.box === box ? null : candidate.box)} className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${candidate.box === box ? 'border-[#4d5bd2] bg-[#eef0fd] text-[#343f9e] dark:border-violet-500 dark:bg-violet-950/40 dark:text-violet-200' : 'border-[#dedcd4] dark:border-zinc-700'}`}>
                      指型 {candidate.box}<span className="ml-1 font-normal text-[#85877f]">{candidate.from}–{candidate.to}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </article>
        )}

        <div className="min-w-0 space-y-3">
          <SoloFretboard
            marks={marks}
            targets={targets}
            range={windowRange}
            only={only}
            onPlayNote={(stringIndex, fret) => { void previewSingleNote(stringIndex, fret, capo).catch(() => undefined); }}
          />
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[#6e716b] dark:text-zinc-400">
            {(mode === 'chord' ? CHORD_LEGEND : SCALE_LEGEND).map(item => (
              <span key={item.role} className="flex items-center gap-1.5"><FretMarkSwatch role={item.role} /><span className="font-semibold text-[#3d403a] dark:text-zinc-200">{item.label}</span>{item.hint}</span>
            ))}
            {mode === 'chord' && <span className="flex items-center gap-1.5"><span className="inline-block h-3.5 w-3.5 rounded-full ring-2 ring-[#e0a526]" /><span className="font-semibold text-[#3d403a] dark:text-zinc-200">圈起來的</span>和弦一進來最穩的音</span>}
            <span>點音可以試聽{capo > 0 ? ' · 格數從 Capo 算起' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArrangeExplorer;
