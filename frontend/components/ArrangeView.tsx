import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, Focus, Lightbulb, Music4, Target } from 'lucide-react';
import { TabSection } from '../types';
import { PlaybackPosition } from '../types/playback';
import {
  Chord,
  ChordSoloAnalysis,
  MusicalKey,
  PitchClass,
  analyzeChordForSolo,
  detectKey,
  formatChord,
  formatKey,
  formatPitch,
  formatScale,
  guideToneMove,
  keyAccidentalPreference,
  keySafeScales,
  parseChord,
  scaleAccidentalPreference,
  toPitchClass,
} from '../music-theory';
import { POSITION_WINDOWS, PositionWindowId, pentatonicBoxes } from '../guitar';
import { SectionChordStep, sectionChordSteps, stepIndexAt } from '../services/progression';
import {
  NoteLabelMode,
  buildChordMarks,
  buildScaleMarks,
  describeFretPosition,
  describeMotion,
  positionsForPitch,
} from '../services/soloGuide';
import { previewSingleNote } from '../services/chordPreview';
import SoloFretboard, { FRET_MARK_LEGEND, FretMarkSwatch } from './SoloFretboard';

interface ArrangeViewProps {
  sections: TabSection[];
  transposeOffset: number;
  playState: PlaybackPosition | null;
}

type ViewMode = 'chord' | 'scale';
type WindowChoice = PositionWindowId | 'all';

interface ParsedStep extends SectionChordStep {
  chord: Chord | null;
}

const ALL_KEYS: MusicalKey[] = Array.from({ length: 12 }, (_, tonic) => tonic as PitchClass)
  .flatMap(tonic => [{ tonic, mode: 'major' as const }, { tonic, mode: 'minor' as const }]);

const keyId = (key: MusicalKey) => `${key.tonic}:${key.mode}`;
const sameKey = (a: MusicalKey, b: MusicalKey) => a.tonic === b.tonic && a.mode === b.mode;

const CONFIDENCE_LABEL = { high: '高', medium: '中', low: '低' } as const;
const ROLE_LABEL: Partial<Record<string, string>> = { third: '3 度', seventh: '7 度', root: '根音' };

const parseSteps = (section: TabSection | undefined, transposeOffset: number): ParsedStep[] =>
  section
    ? sectionChordSteps(section, transposeOffset).map(step => ({ ...step, chord: parseChord(step.effectiveSymbol) }))
    : [];

const segmentButton = (active: boolean) =>
  `h-8 rounded-lg px-3 text-[11px] font-semibold transition-colors ${active
    ? 'bg-[#fffefa] text-[#171a18] shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
    : 'text-[#777a73] hover:text-[#171a18] dark:text-zinc-500 dark:hover:text-zinc-100'}`;

const ArrangeView: React.FC<ArrangeViewProps> = ({ sections, transposeOffset, playState }) => {
  const [sectionIdx, setSectionIdx] = useState(0);
  const [focusIdx, setFocusIdx] = useState(0);
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const [keyOverride, setKeyOverride] = useState<MusicalKey | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('chord');
  const [labelMode, setLabelMode] = useState<NoteLabelMode>('name');
  const [windowChoice, setWindowChoice] = useState<WindowChoice>('all');
  const [safeScaleIdx, setSafeScaleIdx] = useState(0);
  const [box, setBox] = useState<number | null>(null);

  const allChords = useMemo(
    () => sections.flatMap(section => parseSteps(section, transposeOffset).flatMap(step => step.chord ? [step.chord] : [])),
    [sections, transposeOffset]
  );
  const keyCandidates = useMemo(() => detectKey(allChords), [allChords]);
  const autoKey = keyCandidates[0] ?? null;
  const key: MusicalKey | null = keyOverride ?? autoKey;
  const preference = key ? keyAccidentalPreference(key) : 'sharp';

  // Follow playback into its section and chord.
  useEffect(() => {
    if (!playState) return;
    setSectionIdx(playState.sectionIdx);
    const steps = parseSteps(sections[playState.sectionIdx], transposeOffset);
    const index = stepIndexAt(steps, playState.measureIdx, playState.colIdx);
    if (index >= 0) setFocusIdx(index);
  }, [playState, sections, transposeOffset]);

  const section = sections[Math.min(sectionIdx, sections.length - 1)];
  const steps = useMemo(() => parseSteps(section, transposeOffset), [section, transposeOffset]);
  const focusStep = steps[Math.min(focusIdx, steps.length - 1)];
  const nextStep = steps[focusIdx + 1] ?? parseSteps(sections[sectionIdx + 1], transposeOffset)[0];
  const capo = section?.capo ?? 0;

  const analysis: ChordSoloAnalysis | null = useMemo(
    () => (key && focusStep?.chord ? analyzeChordForSolo(focusStep.chord, key) : null),
    [focusStep, key]
  );
  const nextAnalysis = useMemo(
    () => (key && nextStep?.chord ? analyzeChordForSolo(nextStep.chord, key) : null),
    [nextStep, key]
  );
  const safeScales = useMemo(() => (key ? keySafeScales(key) : []), [key]);
  const safeScale = safeScales[Math.min(safeScaleIdx, safeScales.length - 1)];
  const boxes = useMemo(() => {
    if (!safeScale || (safeScale.type !== 'majorPentatonic' && safeScale.type !== 'minorPentatonic')) return [];
    return pentatonicBoxes(safeScale.root, safeScale.type);
  }, [safeScale]);
  const activeBox = viewMode === 'scale' ? boxes.find(candidate => candidate.box === box) ?? null : null;

  const windowRange = activeBox
    ? { from: activeBox.from, to: activeBox.to }
    : windowChoice === 'all' ? null : POSITION_WINDOWS.find(window => window.id === windowChoice) ?? null;
  const suggestionRange = windowRange ?? { from: 0, to: 12 };

  // The current chord's scale decides spelling in its own cards and marks (C7 → Bb, not A#).
  const chordPreference = analysis ? scaleAccidentalPreference(analysis.scale) : preference;
  const marks = viewMode === 'chord'
    ? analysis ? buildChordMarks(analysis, labelMode, chordPreference) : Array(12).fill(null)
    : safeScale ? buildScaleMarks(safeScale, labelMode, scaleAccidentalPreference(safeScale)) : Array(12).fill(null);
  const targets = useMemo(() => new Set(analysis?.targets ?? []), [analysis]);
  const only = useMemo(
    () => activeBox ? new Set(activeBox.notes.map(note => `${note.stringIndex}:${note.fret}`)) : null,
    [activeBox]
  );

  const move = analysis && nextAnalysis ? guideToneMove(analysis, nextAnalysis) : null;

  const selectSection = (index: number) => {
    setSectionIdx(index);
    setFocusIdx(0);
    setSectionMenuOpen(false);
  };

  const pitchName = (pitch: PitchClass) => formatPitch(pitch, chordPreference);
  const chordName = (chord: Chord) => formatChord(chord, preference);
  const where = (pitch: PitchClass) => {
    const positions = positionsForPitch(pitch, suggestionRange);
    return positions.length ? positions.map(describeFretPosition).join('、') : '目前把位沒有這個音';
  };

  if (!key || sections.every(candidate => parseSteps(candidate, transposeOffset).length === 0)) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center" data-testid="arrange-empty">
        <Music4 className="mx-auto mb-4 text-[#9a9c95]" size={32} />
        <h2 className="text-lg font-bold">這首歌還沒有和弦</h2>
        <p className="mt-2 text-sm text-[#6e716b] dark:text-zinc-400">先到「創作」頁為小節加上和弦，這裡就會依和弦進行建議可以使用的單音。</p>
      </div>
    );
  }

  const soundingKey = { ...key, tonic: toPitchClass(key.tonic + capo) };

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-32 pt-6 sm:px-6 lg:px-10" data-testid="arrange-view">
      {/* Key bar */}
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#dedcd4] bg-[#fffefa] p-4 dark:border-zinc-800 dark:bg-zinc-900" data-testid="arrange-key-bar">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#85877f]">調性</div>
          <select
            value={keyId(key)}
            onChange={event => {
              const next = ALL_KEYS.find(candidate => keyId(candidate) === event.target.value) ?? null;
              setKeyOverride(next && autoKey && sameKey(next, autoKey) ? null : next);
              setSafeScaleIdx(0);
              setBox(null);
            }}
            className="mt-1 h-9 rounded-lg border border-[#dedcd4] bg-white px-2 text-sm font-bold dark:border-zinc-700 dark:bg-zinc-800"
            aria-label="調性"
          >
            {ALL_KEYS.map(candidate => (
              <option key={keyId(candidate)} value={keyId(candidate)}>
                {formatKey(candidate)} {candidate.mode === 'major' ? '大調' : '小調'}
                {autoKey && sameKey(candidate, autoKey) ? '（自動判斷）' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
          {!keyOverride && autoKey && (
            <span className="rounded-lg bg-[#e8f0eb] px-2.5 py-1.5 text-[#2b6c59] dark:bg-emerald-950/40 dark:text-emerald-300">
              判斷信心：{CONFIDENCE_LABEL[autoKey.confidence]}
            </span>
          )}
          {keyOverride && (
            <button type="button" onClick={() => setKeyOverride(null)} className="rounded-lg border border-[#dedcd4] px-2.5 py-1.5 text-[#6e716b] hover:text-[#171a18] dark:border-zinc-700 dark:text-zinc-400">
              恢復自動判斷
            </button>
          )}
          {capo > 0 && (
            <span className="rounded-lg border border-[#dedcd4] px-2.5 py-1.5 text-[#6e716b] dark:border-zinc-700 dark:text-zinc-400">
              Capo {capo} · 實際音高 {formatKey(soundingKey)} {key.mode === 'major' ? '大調' : '小調'}
            </span>
          )}
        </div>
        <div className="ml-auto text-right text-[11px] text-[#6e716b] dark:text-zinc-400">
          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#85877f]">全曲安全音階</div>
          <div className="mt-1 font-semibold text-[#171a18] dark:text-zinc-100">
            {safeScales.slice(0, 2).map(scale => formatScale(scale.root, scale.type, preference)).join(key.mode === 'major' ? ' ＝ ' : ' / ')}
          </div>
        </div>
      </section>

      {/* Section + progression */}
      <section className="space-y-3">
        <div className="relative inline-block">
          <button type="button" onClick={() => setSectionMenuOpen(open => !open)} className="flex h-10 items-center gap-2 rounded-xl border border-[#dedcd4] bg-white px-3 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-900">
            <Focus size={14} className="text-[#2b6c59]" />
            <span>{section?.title ?? '選擇段落'}</span>
            <ChevronDown size={13} />
          </button>
          {sectionMenuOpen && (
            <div className="absolute left-0 top-12 z-50 min-w-48 rounded-xl border border-[#dedcd4] bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              {sections.map((candidate, index) => (
                <button key={candidate.id} type="button" onClick={() => selectSection(index)} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#efede7] dark:hover:bg-zinc-800">{candidate.title}</button>
              ))}
            </div>
          )}
        </div>

        {steps.length === 0 ? (
          <p className="text-sm text-[#6e716b] dark:text-zinc-400">這個段落沒有和弦。</p>
        ) : (
          <div className="flex flex-wrap gap-2" data-testid="arrange-progression">
            {steps.map((step, index) => {
              const fn = step.chord ? analyzeChordForSolo(step.chord, key).function : null;
              const active = index === focusIdx;
              return (
                <button
                  key={`${step.measureIdx}:${step.colIdx}`}
                  type="button"
                  onClick={() => setFocusIdx(index)}
                  disabled={!step.chord}
                  className={`flex min-w-16 flex-col items-start rounded-xl border px-3 py-2 text-left transition-colors ${active
                    ? 'border-[#4d5bd2] bg-[#eef0fd] dark:border-violet-500 dark:bg-violet-950/40'
                    : 'border-[#dedcd4] bg-[#fffefa] hover:border-[#bfc2e8] dark:border-zinc-800 dark:bg-zinc-900'} disabled:opacity-50`}
                >
                  <span className="font-mono text-sm font-bold">{step.chord ? chordName(step.chord) : step.effectiveSymbol}</span>
                  <span className="text-[10px] font-semibold text-[#85877f]">
                    {fn ? fn.secondaryDominant ?? fn.numeral : '無法分析'}
                  </span>
                  {fn && !fn.diatonic && (
                    <span className="mt-1 rounded bg-[#fbf1dc] px-1.5 py-0.5 text-[9px] font-semibold text-[#8a5a12] dark:bg-amber-950/60 dark:text-amber-200">調外</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Controls */}
      <section className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl bg-[#efede7] p-1 dark:bg-zinc-900" role="group" aria-label="顯示模式">
          <button type="button" className={segmentButton(viewMode === 'chord')} onClick={() => setViewMode('chord')}>跟著和弦</button>
          <button type="button" className={segmentButton(viewMode === 'scale')} onClick={() => setViewMode('scale')}>全曲音階</button>
        </div>
        <div className="flex flex-wrap rounded-xl bg-[#efede7] p-1 dark:bg-zinc-900" role="group" aria-label="把位">
          <button type="button" className={segmentButton(windowChoice === 'all' && !activeBox)} onClick={() => { setWindowChoice('all'); setBox(null); }}>全部</button>
          {POSITION_WINDOWS.map(window => (
            <button key={window.id} type="button" className={segmentButton(windowChoice === window.id && !activeBox)} onClick={() => { setWindowChoice(window.id); setBox(null); }}>
              {window.label}
            </button>
          ))}
        </div>
        <div className="flex rounded-xl bg-[#efede7] p-1 dark:bg-zinc-900" role="group" aria-label="標示">
          <button type="button" className={segmentButton(labelMode === 'name')} onClick={() => setLabelMode('name')}>音名</button>
          <button type="button" className={segmentButton(labelMode === 'degree')} onClick={() => setLabelMode('degree')}>級數</button>
        </div>
      </section>

      {viewMode === 'scale' && (
        <section className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap rounded-xl bg-[#efede7] p-1 dark:bg-zinc-900" role="group" aria-label="音階">
            {safeScales.map((scale, index) => (
              <button key={`${scale.root}:${scale.type}`} type="button" className={segmentButton(index === safeScaleIdx)} onClick={() => { setSafeScaleIdx(index); setBox(null); }}>
                {formatScale(scale.root, scale.type, preference)}
              </button>
            ))}
          </div>
          {boxes.length > 0 && (
            <div className="flex flex-wrap rounded-xl bg-[#efede7] p-1 dark:bg-zinc-900" role="group" aria-label="五聲指型">
              {boxes.map(candidate => (
                <button key={candidate.box} type="button" className={segmentButton(candidate.box === box)} onClick={() => setBox(candidate.box === box ? null : candidate.box)}>
                  指型 {candidate.box}（{candidate.from}–{candidate.to} 格）
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <SoloFretboard
        marks={marks}
        targets={targets}
        window={windowRange}
        only={only}
        onPlayNote={(stringIndex, fret) => { void previewSingleNote(stringIndex, fret, capo).catch(() => undefined); }}
      />

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[#6e716b] dark:text-zinc-400">
        {FRET_MARK_LEGEND.filter(item => viewMode === 'scale' ? item.role === 'root' || item.role === 'scale' : item.role !== 'scale').map(item => (
          <span key={item.role} className="flex items-center gap-1.5"><FretMarkSwatch role={item.role} />{item.label}</span>
        ))}
        <span className="flex items-center gap-1.5"><span className="inline-block h-3.5 w-3.5 rounded-full ring-2 ring-[#2b6c59] dark:ring-emerald-400" />換和弦時的目標音</span>
        {capo > 0 && <span>格數以 Capo 為 0 格</span>}
      </div>

      {/* Suggestions */}
      {analysis && focusStep?.chord && (
        <section className="grid gap-4 md:grid-cols-2" data-testid="arrange-suggestions">
          <article className="rounded-2xl border border-[#dedcd4] bg-[#fffefa] p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="flex items-center gap-2 text-sm font-bold"><Target size={16} className="text-[#2b6c59]" />{chordName(focusStep.chord)} 的單音重點</h3>
            <p className="mt-2 text-xs text-[#6e716b] dark:text-zinc-400">
              {analysis.function.secondaryDominant ?? analysis.function.numeral} · 音階：{formatScale(analysis.scale.root, analysis.scale.type, chordPreference)}
            </p>
            {analysis.scale.reason && <p className="mt-2 rounded-lg bg-[#fbf1dc] px-3 py-2 text-xs text-[#8a5a12] dark:bg-amber-950/50 dark:text-amber-200">{analysis.scale.reason}</p>}
            <ul className="mt-3 space-y-2 text-xs">
              {analysis.targets.map(pitch => (
                <li key={pitch}>
                  <span className="font-semibold">{ROLE_LABEL[analysis.roles[pitch]] ?? ''} {pitchName(pitch)}</span>
                  <span className="text-[#6e716b] dark:text-zinc-400">：{where(pitch)}</span>
                </li>
              ))}
              {analysis.roles.some(role => role === 'passing') && (
                <li className="text-[#6e716b] dark:text-zinc-400">
                  經過音 {analysis.roles.flatMap((role, pitch) => role === 'passing' ? [pitchName(toPitchClass(pitch))] : []).join('、')}：放在弱拍，接著解決到和弦音。
                </li>
              )}
              {analysis.bass !== undefined && (
                <li className="text-[#6e716b] dark:text-zinc-400">
                  斜線和弦低音 {pitchName(analysis.bass)}：可以用單音彈出低音線（{where(analysis.bass)}）。
                </li>
              )}
            </ul>
          </article>

          <article className="rounded-2xl border border-[#dedcd4] bg-[#fffefa] p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="flex items-center gap-2 text-sm font-bold"><ArrowRight size={16} className="text-[#4d5bd2]" />換到下一個和弦</h3>
            {move && nextStep?.chord ? (
              <>
                <p className="mt-2 text-xs text-[#6e716b] dark:text-zinc-400">
                  {chordName(focusStep.chord)} → {chordName(nextStep.chord)}
                </p>
                <p className="mt-3 text-sm">
                  <span className="font-mono font-bold">{pitchName(move.from)} → {pitchName(move.to)}</span>
                  <span className="ml-2 text-xs text-[#6e716b] dark:text-zinc-400">{describeMotion(move.semitones)}（引導音連接）</span>
                </p>
                <p className="mt-2 text-xs text-[#6e716b] dark:text-zinc-400">落點 {pitchName(move.to)}：{where(move.to)}</p>
                <p className="mt-2 text-xs text-[#6e716b] dark:text-zinc-400">
                  半音接近：換和弦前半拍先彈 {pitchName(toPitchClass(move.to - 1))}，再推到 {pitchName(move.to)}。
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs text-[#6e716b] dark:text-zinc-400">這是最後一個和弦，可以停在根音 {pitchName(analysis.chord.root)} 或 3 度收尾。</p>
            )}
          </article>

          <article className="rounded-2xl border border-[#dedcd4] bg-[#fffefa] p-5 dark:border-zinc-800 dark:bg-zinc-900 md:col-span-2">
            <h3 className="flex items-center gap-2 text-sm font-bold"><Lightbulb size={16} className="text-[#8a5a12]" />編曲常用手法</h3>
            <ul className="mt-3 grid gap-3 text-xs text-[#6e716b] dark:text-zinc-400 sm:grid-cols-2">
              <li><span className="font-semibold text-[#171a18] dark:text-zinc-100">引導音線：</span>每個和弦只彈 3 度或 7 度，用最小的移動連起來，旋律感最強。</li>
              <li><span className="font-semibold text-[#171a18] dark:text-zinc-100">琶音：</span>沿著和弦音（根音、3 度、5 度）上下行，搭配和弦當下的把位。</li>
              <li><span className="font-semibold text-[#171a18] dark:text-zinc-100">三度 / 六度雙音：</span>兩個相鄰的和弦音一起彈，抒情歌過門很常見。</li>
              <li><span className="font-semibold text-[#171a18] dark:text-zinc-100">留白：</span>主唱唱的時候少彈，句尾和間奏再用單音補空隙。</li>
            </ul>
          </article>
        </section>
      )}
    </div>
  );
};

export default ArrangeView;
