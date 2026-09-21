import React, { useEffect, useMemo, useState } from 'react';
import { BookmarkPlus, Check, ChevronLeft, ChevronRight, Clipboard, Grid2X2, ListFilter, Plus, Search, Sparkles, Trash2, Volume2 } from 'lucide-react';
import { TUNING_STANDARD } from '../constants';
import { inferVoicingTags } from '../guitar';
import { usePositionedVoicings, VOICING_POSITION_LABELS, VOICING_POSITIONS } from '../hooks/usePositionedVoicings';
import { formatPitch, getChordPitchClasses, parseChord } from '../music-theory';
import { detectChordCandidates } from '../services/chordDetector';
import { ChordDefinition } from '../types';
import ChordDiagram from './ChordDiagram';
import { previewChordVoicing } from '../services/chordPreview';
import ChordCandidatePicker from './ChordCandidatePicker';

type ShapeFilter = 'all' | 'open' | 'easy' | 'barre' | 'custom';
type ChordFamily = 'all' | 'basic' | 'seventh' | 'color' | 'tension';
type LibraryChord = ChordDefinition & { isStandard: boolean };

const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const QUALITIES = [
  { value: '', label: 'Major', family: 'basic' }, { value: 'm', label: 'minor', family: 'basic' },
  { value: '7', label: '7', family: 'seventh' }, { value: 'maj7', label: 'maj7', family: 'seventh' }, { value: 'm7', label: 'm7', family: 'seventh' },
  { value: '6', label: '6', family: 'color' }, { value: 'm6', label: 'm6', family: 'color' }, { value: 'sus2', label: 'sus2', family: 'color' }, { value: 'sus4', label: 'sus4', family: 'color' }, { value: 'add9', label: 'add9', family: 'color' },
  { value: 'dim', label: 'dim', family: 'tension' }, { value: 'aug', label: 'aug', family: 'tension' }, { value: 'm7b5', label: 'm7♭5', family: 'tension' }, { value: 'dim7', label: 'dim7', family: 'tension' },
  { value: '9', label: '9', family: 'tension' }, { value: 'maj9', label: 'maj9', family: 'tension' }, { value: 'm9', label: 'm9', family: 'tension' },
] as const;
const FAMILIES: Array<{ value: ChordFamily; label: string }> = [
  { value: 'all', label: '全部' }, { value: 'basic', label: '基礎' }, { value: 'seventh', label: '七和弦' },
  { value: 'color', label: '色彩' }, { value: 'tension', label: '延伸 / 張力' },
];
const SHAPES: Array<{ value: ShapeFilter; label: string }> = [
  { value: 'all', label: '全部' }, { value: 'easy', label: '好上手' }, { value: 'open', label: '開放和弦' },
  { value: 'barre', label: '封閉和弦' }, { value: 'custom', label: '我的收藏' },
];
const sameFrets = (left: Array<number | null>, right: Array<number | null>) => left.length === right.length && left.every((fret, index) => fret === right[index]);
const chordRoot = (name: string) => name.match(/^([A-G](?:#|b)?)/)?.[1] ?? '';
const chordQuality = (name: string) => name.slice(chordRoot(name).length).split('/')[0];
const matchesQuality = (name: string, quality: string | null) => {
  if (quality === null) return true;
  const value = chordQuality(name);
  if (quality === '') return value === '';
  if (quality === 'm') return value === 'm';
  return value === quality;
};
const qualityFamily = (name: string): ChordFamily | 'other' => QUALITIES.find(quality => quality.value === chordQuality(name))?.family ?? 'other';
const chordSort = (left: LibraryChord, right: LibraryChord) => {
  const rootDifference = ROOTS.indexOf(chordRoot(left.name)) - ROOTS.indexOf(chordRoot(right.name));
  if (rootDifference !== 0) return rootDifference;
  const leftQuality = QUALITIES.findIndex(quality => quality.value === chordQuality(left.name));
  const rightQuality = QUALITIES.findIndex(quality => quality.value === chordQuality(right.name));
  return leftQuality - rightQuality || left.name.localeCompare(right.name);
};

interface ChordManagerProps {
  customChords: ChordDefinition[];
  globalChords?: ChordDefinition[];
  onAddChord: (chord: ChordDefinition) => void;
  onDeleteChord: (name: string) => void;
  theme?: 'light' | 'dark';
  initialChord?: string | null;
}

const ChordManager: React.FC<ChordManagerProps> = ({ customChords, globalChords = [], onAddChord, onDeleteChord, theme = 'light', initialChord = null }) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'create'>('browse');
  const [selectedChordName, setSelectedChordName] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [rootFilter, setRootFilter] = useState<string | null>(null);
  const [qualityFilter, setQualityFilter] = useState<string | null>(null);
  const [familyFilter, setFamilyFilter] = useState<ChordFamily>('all');
  const [shapeFilter, setShapeFilter] = useState<ShapeFilter>('all');
  const [comparisonIndices, setComparisonIndices] = useState<number[]>([0]);
  const [copied, setCopied] = useState(false);
  const [auditioning, setAuditioning] = useState(false);
  const [newChordName, setNewChordName] = useState('');
  const [newFrets, setNewFrets] = useState<Array<number | null>>([null, null, null, null, null, null]);

  const fullLibrary = useMemo<LibraryChord[]>(() => [
    ...globalChords.map(chord => ({ ...chord, isStandard: true })),
    ...customChords.map(chord => ({ ...chord, isStandard: false })),
  ], [globalChords, customChords]);
  const resultChords = useMemo(() => {
    const matches = fullLibrary.filter(chord => {
      if (!chord.name.toLowerCase().includes(searchTerm.trim().toLowerCase())) return false;
      if (rootFilter && chordRoot(chord.name) !== rootFilter) return false;
      if (familyFilter !== 'all' && qualityFamily(chord.name) !== familyFilter) return false;
      if (!matchesQuality(chord.name, qualityFilter)) return false;
      if (shapeFilter === 'custom') return !chord.isStandard;
      return shapeFilter === 'all' || inferVoicingTags(chord.frets, chord.barres).includes(shapeFilter);
    });
    return Array.from(new Map(matches.map(chord => [chord.name, chord])).values()).sort(chordSort);
  }, [familyFilter, fullLibrary, qualityFilter, rootFilter, searchTerm, shapeFilter]);
  const groupedResultChords = useMemo(() => {
    const groups = new Map<string, LibraryChord[]>();
    resultChords.forEach(chord => {
      const root = chordRoot(chord.name) || '其他';
      groups.set(root, [...(groups.get(root) ?? []), chord]);
    });
    return Array.from(groups.entries());
  }, [resultChords]);
  const visibleQualities = familyFilter === 'all' ? QUALITIES : QUALITIES.filter(quality => quality.family === familyFilter);

  useEffect(() => {
    if (selectedChordName && fullLibrary.some(chord => chord.name === selectedChordName)) return;
    setSelectedChordName((fullLibrary.find(chord => chord.name === initialChord) ?? fullLibrary.find(chord => chord.name === 'Cmaj7') ?? fullLibrary[0])?.name ?? null);
  }, [fullLibrary, initialChord, selectedChordName]);

  const selectedChord = useMemo(() => fullLibrary.find(chord => chord.name === selectedChordName) ?? null, [fullLibrary, selectedChordName]);
  const {
    position: positionFilter,
    setPosition: setPositionFilter,
    voicingIndex,
    setVoicingIndex,
    results: voicingResults,
    result: voicingResult,
    shape: selectedShape,
    shapePosition: selectedPosition,
  } = usePositionedVoicings({ symbol: selectedChord?.name ?? null, chordLibrary: fullLibrary });
  const selectedShapeSaved = Boolean(selectedChord && selectedShape && customChords.some(chord => chord.name === selectedChord.name && sameFrets(chord.frets, selectedShape.frets)));
  const chordDetection = useMemo(() => detectChordCandidates(newFrets, fullLibrary), [fullLibrary, newFrets]);
  const parsedChord = selectedChord ? parseChord(selectedChord.name) : null;
  const chordTones = parsedChord ? getChordPitchClasses(parsedChord).map(note => formatPitch(note, parsedChord.accidentalPreference)) : [];
  const frets = selectedShape?.frets ?? selectedChord?.frets ?? [];
  const pressedFrets = frets.filter((fret): fret is number => fret !== null && fret > 0);
  const startFret = pressedFrets.length ? Math.min(...pressedFrets) : 0;
  const fretSpan = pressedFrets.length ? Math.max(...pressedFrets) - Math.min(...pressedFrets) + 1 : 0;
  const difficulty = !selectedShape || selectedShape.score >= 125 ? 'Easy' : selectedShape.score >= 105 ? 'Medium' : 'Advanced';

  useEffect(() => { setVoicingIndex(0); setComparisonIndices([0]); }, [positionFilter, selectedChordName]);
  useEffect(() => {
    const last = Math.max(0, (voicingResult?.shapes.length ?? 1) - 1);
    setVoicingIndex(index => Math.min(index, last));
    setComparisonIndices(indices => indices.filter(index => index <= last).slice(0, 3));
  }, [voicingResult?.shapes.length]);

  const clearFilters = () => { setSearchTerm(''); setRootFilter(null); setQualityFilter(null); setFamilyFilter('all'); setShapeFilter('all'); };
  const selectFamily = (family: ChordFamily) => {
    setFamilyFilter(family);
    if (qualityFilter !== null && family !== 'all' && QUALITIES.find(quality => quality.value === qualityFilter)?.family !== family) setQualityFilter(null);
  };
  const toggleComparison = (index: number) => setComparisonIndices(indices => indices.includes(index) ? indices.filter(value => value !== index) : [...indices, index].slice(-3));
  const toggleFret = (stringIndex: number, fret: number | null) => setNewFrets(current => current.map((value, index) => index === stringIndex ? (value === fret ? null : fret) : value));
  const saveCustomChord = () => {
    const name = newChordName.trim();
    if (!name) return;
    onAddChord({ name, frets: newFrets }); setSelectedChordName(name); setNewChordName('');
    setNewFrets([null, null, null, null, null, null]); setActiveTab('browse');
  };
  const saveSelectedShape = () => {
    if (!selectedChord || !selectedShape || selectedShapeSaved) return;
    onAddChord({ name: selectedChord.name, frets: [...selectedShape.frets], fingers: selectedShape.fingers, barres: selectedShape.barres });
  };
  const copyShape = async () => {
    if (!selectedChord || frets.length === 0) return;
    await navigator.clipboard?.writeText(`${selectedChord.name}: ${frets.map(fret => fret ?? 'X').reverse().join(' ')}`);
    setCopied(true); window.setTimeout(() => setCopied(false), 1400);
  };
  const auditionShape = async () => {
    if (!selectedShape || auditioning) return;
    setAuditioning(true);
    try {
      await previewChordVoicing(selectedShape.frets);
      window.setTimeout(() => setAuditioning(false), 900);
    } catch {
      setAuditioning(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f7f6f2] text-[#1b1c1e] transition-colors dark:bg-zinc-950 dark:text-zinc-100">
      <section className="shrink-0 border-b border-[#deddd7] bg-[#fbfaf7] px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="flex items-center gap-3 xl:w-[310px]">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#3154d7] dark:text-violet-400">Chord Lab</p><h2 className="mt-0.5 text-xl font-bold tracking-tight">探索適合你的指法</h2></div>
            <button type="button" onClick={() => setActiveTab(activeTab === 'browse' ? 'create' : 'browse')} className="ml-auto flex items-center gap-2 rounded-xl border border-[#d8d7d0] bg-white px-3 py-2 text-xs font-semibold transition-colors hover:border-[#3154d7] hover:text-[#3154d7] dark:border-zinc-700 dark:bg-zinc-900">
              {activeTab === 'browse' ? <><Plus size={15} /> 建立指法</> : <><Grid2X2 size={15} /> 返回和弦庫</>}
            </button>
          </div>
          {activeTab === 'browse' && <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row">
            <label className="relative block min-w-56 flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8983]" size={16} /><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="搜尋 Cmaj7、Am、Gsus4…" aria-label="搜尋和弦" className="h-11 w-full rounded-xl border border-[#d8d7d0] bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[#3154d7] focus:ring-4 focus:ring-[#3154d7]/10 dark:border-zinc-700 dark:bg-zinc-900" /></label>
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#d8d7d0] bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">{SHAPES.map(filter => <button key={filter.value} type="button" onClick={() => setShapeFilter(filter.value)} className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors ${shapeFilter === filter.value ? 'bg-[#1b1c1e] text-white dark:bg-zinc-100 dark:text-zinc-950' : 'text-[#6e6d68] hover:text-[#1b1c1e] dark:text-zinc-400 dark:hover:text-white'}`}>{filter.label}</button>)}</div>
          </div>}
        </div>
        {activeTab === 'browse' && <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr]">
          <div className="flex items-center gap-1 overflow-x-auto"><span className="mr-2 shrink-0 text-[9px] font-bold uppercase tracking-[0.16em] text-[#92918b]">Root</span>{ROOTS.map(root => <button key={root} type="button" onClick={() => setRootFilter(rootFilter === root ? null : root)} className={`grid h-8 min-w-8 shrink-0 place-items-center rounded-lg px-2 font-mono text-xs font-bold transition-colors ${rootFilter === root ? 'bg-[#3154d7] text-white' : 'bg-[#ecebe5] text-[#5f5e59] hover:bg-[#dfded7] dark:bg-zinc-900 dark:text-zinc-400'}`}>{root}</button>)}</div>
          <div className="flex items-center gap-1 overflow-x-auto xl:justify-end"><span className="mr-2 shrink-0 text-[9px] font-bold uppercase tracking-[0.16em] text-[#92918b]">Family</span>{FAMILIES.map(family => <button key={family.value} type="button" onClick={() => selectFamily(family.value)} className={`shrink-0 rounded-lg px-2.5 py-2 text-[11px] font-semibold transition-colors ${familyFilter === family.value ? 'bg-[#1b1c1e] text-white dark:bg-zinc-100 dark:text-zinc-950' : 'text-[#676660] hover:bg-[#ecebe5] dark:text-zinc-400 dark:hover:bg-zinc-900'}`}>{family.label}</button>)}</div>
          <div className="flex items-center gap-1 overflow-x-auto xl:col-span-2"><span className="mr-2 shrink-0 text-[9px] font-bold uppercase tracking-[0.16em] text-[#92918b]">Quality</span>{visibleQualities.map(quality => <button key={quality.label} type="button" onClick={() => setQualityFilter(qualityFilter === quality.value ? null : quality.value)} className={`shrink-0 rounded-lg px-2.5 py-2 text-[11px] font-semibold transition-colors ${qualityFilter === quality.value ? 'bg-[#dfe5ff] text-[#2343ba] dark:bg-violet-950 dark:text-violet-300' : 'text-[#676660] hover:bg-[#ecebe5] dark:text-zinc-400 dark:hover:bg-zinc-900'}`}>{quality.label}</button>)}</div>
        </div>}
      </section>

      {activeTab === 'browse' ? <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[300px_minmax(390px,1fr)_300px] lg:overflow-hidden 2xl:grid-cols-[340px_minmax(460px,1fr)_340px]">
        <aside className="border-b border-[#deddd7] bg-[#f2f1ec] dark:border-zinc-800 dark:bg-zinc-950 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#deddd7] bg-[#f2f1ec]/95 px-5 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"><div className="flex items-center gap-2 text-xs font-semibold"><ListFilter size={14} /> {resultChords.length} 個和弦</div>{(searchTerm || rootFilter || qualityFilter !== null || familyFilter !== 'all' || shapeFilter !== 'all') && <button type="button" onClick={clearFilters} className="text-[10px] font-semibold text-[#3154d7]">清除篩選</button>}</div>
          <div className="flex gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-visible">
            {groupedResultChords.map(([root, chords]) => <div key={root} className="contents lg:block"><div className="mb-1 mt-3 hidden items-center gap-2 px-3 first:mt-0 lg:flex"><span className="font-mono text-[10px] font-bold text-[#3154d7]">{root}</span><span className="h-px flex-1 bg-[#deddd7] dark:bg-zinc-800" /><span className="text-[9px] text-[#92918b]">{chords.length}</span></div>{chords.map(chord => { const tags = inferVoicingTags(chord.frets, chord.barres); return <button key={chord.name} type="button" onClick={() => setSelectedChordName(chord.name)} className={`group mb-1 flex min-w-[230px] items-center gap-3 rounded-2xl border p-3 text-left transition-all lg:min-w-0 lg:w-full ${selectedChordName === chord.name ? 'border-[#3154d7] bg-white shadow-[0_8px_28px_rgba(49,84,215,0.10)] dark:bg-zinc-900' : 'border-transparent hover:border-[#d6d5ce] hover:bg-white/70 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60'}`}><div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white dark:bg-zinc-900"><div className="scale-[0.44]"><ChordDiagram chord={chord} size={100} theme={theme} variant="bare" /></div></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate font-mono text-base font-bold">{chord.name}</span>{!chord.isStandard && <span className="rounded-full bg-[#f3dfbb] px-1.5 py-0.5 text-[8px] font-bold uppercase text-[#855a12]">Mine</span>}</div><div className="mt-1 flex flex-wrap gap-1 text-[9px] font-semibold uppercase tracking-wide text-[#8a8983]">{(tags.length ? tags : ['shape']).slice(0, 2).map(tag => <span key={tag}>{tag}</span>)}</div></div><ChevronRight size={15} className={selectedChordName === chord.name ? 'text-[#3154d7]' : 'text-[#aaa9a2]'} /></button>; })}</div>)}
            {resultChords.length === 0 && <div className="min-w-[260px] rounded-2xl border border-dashed border-[#c9c8c1] p-8 text-center lg:min-w-0"><Search className="mx-auto text-[#aaa9a2]" size={20} /><p className="mt-3 text-sm font-semibold">找不到符合的和弦</p><button type="button" onClick={clearFilters} className="mt-2 text-xs font-semibold text-[#3154d7]">重設條件</button></div>}
          </div>
        </aside>

        <main className="flex min-h-[600px] flex-col bg-[#fbfaf7] px-5 py-7 dark:bg-zinc-950 sm:px-8 lg:min-h-0 lg:overflow-y-auto lg:px-10">
          {selectedChord && selectedShape ? <>
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a8983]">Selected chord</p><h3 className="mt-1 font-mono text-4xl font-bold tracking-tight sm:text-5xl">{selectedChord.name}</h3><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-[#dfe5ff] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#2343ba] dark:bg-violet-950 dark:text-violet-300">{selectedShape.source}</span>{selectedPosition && <span className="rounded-full bg-[#e7f3eb] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#277447] dark:bg-emerald-950 dark:text-emerald-300">{VOICING_POSITION_LABELS[selectedPosition]}</span>}{selectedShape.tags.map(tag => <span key={tag} className="rounded-full bg-[#ecebe5] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#6d6c66] dark:bg-zinc-900 dark:text-zinc-400">{tag}</span>)}</div></div><div className="flex gap-2"><button type="button" onClick={auditionShape} disabled={auditioning} className={`grid h-10 w-10 place-items-center rounded-full border transition ${auditioning ? 'border-[#8fbca2] bg-[#e7f3eb] text-[#277447]' : 'border-[#d8d7d0] bg-white text-[#62615c] hover:border-[#3154d7] hover:text-[#3154d7] dark:border-zinc-700 dark:bg-zinc-900'}`} aria-label="試聽和弦"><Volume2 size={16} /></button><button type="button" onClick={copyShape} className="grid h-10 w-10 place-items-center rounded-full border border-[#d8d7d0] bg-white text-[#62615c] transition hover:border-[#3154d7] hover:text-[#3154d7] dark:border-zinc-700 dark:bg-zinc-900" aria-label="複製指法"><Clipboard size={16} /></button><button type="button" onClick={saveSelectedShape} disabled={selectedShapeSaved} className={`grid h-10 w-10 place-items-center rounded-full border transition ${selectedShapeSaved ? 'border-[#8fbca2] bg-[#e7f3eb] text-[#277447]' : 'border-[#d8d7d0] bg-white text-[#62615c] hover:border-[#3154d7] hover:text-[#3154d7] dark:border-zinc-700 dark:bg-zinc-900'}`} aria-label="儲存指法">{selectedShapeSaved ? <Check size={17} /> : <BookmarkPlus size={17} />}</button></div></div>
            <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-[#deddd7] bg-[#f2f1ec] p-1.5 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-4">{VOICING_POSITIONS.map(position => { const count = voicingResults?.[position.value]?.shapes.length ?? 0; return <button key={position.value} type="button" onClick={() => setPositionFilter(position.value)} disabled={count === 0} className={`rounded-xl px-3 py-2.5 text-left transition ${positionFilter === position.value ? 'bg-white text-[#1b1c1e] shadow-sm ring-1 ring-[#d8d7d0] dark:bg-zinc-800 dark:text-white dark:ring-zinc-700' : 'text-[#77766f] hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-35 dark:text-zinc-400 dark:hover:bg-zinc-800/60'}`}><span className="flex items-center justify-between gap-2 text-xs font-bold"><span>{position.label}</span><span className="font-mono text-[9px] text-[#92918b]">{count}</span></span><span className="mt-0.5 block text-[9px] font-medium text-[#92918b]">{position.range}</span></button>; })}</div>
            <div className="flex flex-1 flex-col items-center justify-center py-8"><div className="relative grid min-h-[320px] w-full max-w-xl place-items-center rounded-[32px] border border-[#e0dfd9] bg-white p-6 shadow-[0_22px_70px_rgba(43,43,38,0.06)] dark:border-zinc-800 dark:bg-zinc-900"><ChordDiagram chord={{ name: selectedChord.name, frets: selectedShape.frets, fingers: selectedShape.fingers, barres: selectedShape.barres }} size={270} theme={theme} variant="bare" /><div className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#f1f0ea] px-4 py-2 font-mono text-xs font-semibold tracking-[0.18em] text-[#55544f] dark:bg-zinc-800 dark:text-zinc-300">{selectedShape.frets.map(fret => fret ?? 'X').reverse().join(' ')}</div></div></div>
            <div className="mx-auto flex w-full max-w-xl items-center justify-between rounded-2xl border border-[#deddd7] bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"><button type="button" onClick={() => setVoicingIndex(index => Math.max(0, index - 1))} disabled={voicingIndex === 0} className="rounded-full p-2 text-[#66655f] hover:bg-[#ecebe5] disabled:opacity-25 dark:hover:bg-zinc-800" aria-label="上一個指法"><ChevronLeft size={20} /></button><div className="text-center"><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#92918b]">Voicing</p><p className="mt-0.5 text-sm font-bold">{voicingIndex + 1} / {voicingResult.shapes.length}</p></div><button type="button" onClick={() => setVoicingIndex(index => Math.min(voicingResult.shapes.length - 1, index + 1))} disabled={voicingIndex >= voicingResult.shapes.length - 1} className="rounded-full p-2 text-[#66655f] hover:bg-[#ecebe5] disabled:opacity-25 dark:hover:bg-zinc-800" aria-label="下一個指法"><ChevronRight size={20} /></button></div>
            {copied && <div className="mt-3 text-center text-xs font-semibold text-[#277447]">已複製和弦與指法</div>}
          </> : <div className="grid h-full place-items-center text-center text-sm text-[#787772]">請從左側選擇一個和弦。</div>}
        </main>

        <aside className="border-t border-[#deddd7] bg-[#f2f1ec] dark:border-zinc-800 dark:bg-zinc-950 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0"><div className="p-5 2xl:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a8983]">Voicing analysis</p><h3 className="mt-1 text-lg font-bold">這個指法的手感</h3>
          <div className="mt-5 grid grid-cols-2 gap-2">{[['難度', difficulty], ['起始格', startFret === 0 ? 'Open' : String(startFret)], ['跨度', `${fretSpan} frets`], ['空弦', String(frets.filter(fret => fret === 0).length)], ['悶弦', String(frets.filter(fret => fret === null).length)], ['評分', selectedShape ? String(Math.round(selectedShape.score)) : '—']].map(([label, value]) => <div key={label} className="rounded-xl border border-[#deddd7] bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"><p className="text-[9px] font-semibold uppercase tracking-wider text-[#989791]">{label}</p><p className="mt-1 font-mono text-sm font-bold">{value}</p></div>)}</div>
          <div className="mt-5 rounded-2xl border border-[#deddd7] bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#989791]">Chord tones</p><p className="mt-2 font-mono text-sm font-bold tracking-wider">{chordTones.length ? chordTones.join(' · ') : '—'}</p></div>
          <div className="mt-5"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a8983]">比較指法</p><span className="text-[9px] text-[#92918b]">最多 3 個</span></div><div className="mt-2 space-y-2">{voicingResult?.shapes.slice(0, 6).map((shape, index) => { const selected = comparisonIndices.includes(index); return <button key={`${shape.frets.join('-')}-${index}`} type="button" onClick={() => { setVoicingIndex(index); toggleComparison(index); }} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? 'border-[#3154d7] bg-[#eef1ff] dark:bg-violet-950/30' : 'border-[#deddd7] bg-white hover:border-[#aaa9a2] dark:border-zinc-800 dark:bg-zinc-900'}`}><span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${selected ? 'bg-[#3154d7] text-white' : 'bg-[#ecebe5] text-[#77766f] dark:bg-zinc-800'}`}>{index + 1}</span><span className="min-w-0 flex-1 font-mono text-[10px] font-semibold">{shape.frets.map(fret => fret ?? 'X').reverse().join(' ')}</span><span className="text-[8px] font-bold uppercase text-[#92918b]">{shape.tags[0] ?? shape.source}</span></button>; })}</div></div>
          {!selectedChord?.isStandard && selectedChord && <button type="button" onClick={() => { onDeleteChord(selectedChord.name); setSelectedChordName(null); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-3 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"><Trash2 size={14} /> 刪除自訂和弦</button>}
        </div></aside>
      </div> : <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[28px] border border-[#deddd7] bg-white shadow-[0_24px_80px_rgba(43,43,38,0.08)] dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-[1fr_360px]">
          <div className="p-6 sm:p-9"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#3154d7] text-white"><Sparkles size={18} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3154d7]">Custom shape</p><h3 className="text-2xl font-bold">建立自己的和弦</h3></div></div>
            <label className="mt-8 block"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#85847e]">和弦名稱</span><input value={newChordName} onChange={event => setNewChordName(event.target.value)} placeholder="例如 Amaj9" className="mt-2 w-full rounded-xl border border-[#d8d7d0] bg-[#fbfaf7] px-4 py-3 text-lg font-bold outline-none focus:border-[#3154d7] dark:border-zinc-700 dark:bg-zinc-950" /></label>
            <div className="mt-3"><ChordCandidatePicker result={chordDetection} currentName={newChordName} onConfirm={setNewChordName} compact /></div>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-[#deddd7] bg-[#f7f6f2] p-5 dark:border-zinc-800 dark:bg-zinc-950"><div className="grid min-w-[480px] grid-cols-6 gap-3">{TUNING_STANDARD.map((string, stringIndex) => <div key={`${string}-${stringIndex}`} className="text-center"><p className="mb-3 font-mono text-xs font-bold text-[#77766f]">{string}</p><button type="button" onClick={() => toggleFret(stringIndex, newFrets[stringIndex] === 0 ? null : 0)} className={`mb-2 h-9 w-9 rounded-full border text-xs font-bold ${newFrets[stringIndex] === 0 ? 'border-[#3154d7] bg-[#3154d7] text-white' : 'border-[#d2d1ca] bg-white text-[#77766f] dark:border-zinc-700 dark:bg-zinc-900'}`}>{newFrets[stringIndex] === null ? 'X' : newFrets[stringIndex] === 0 ? 'O' : '·'}</button>{[1, 2, 3, 4, 5].map(fret => <button key={fret} type="button" onClick={() => toggleFret(stringIndex, fret)} className={`mx-auto my-1 grid h-9 w-9 place-items-center rounded-full text-xs font-bold transition ${newFrets[stringIndex] === fret ? 'bg-[#1b1c1e] text-white dark:bg-white dark:text-zinc-950' : 'text-[#aaa9a2] hover:bg-[#e6e5df] dark:hover:bg-zinc-800'}`}>{fret}</button>)}</div>)}</div></div>
          </div>
          <aside className="flex flex-col border-t border-[#deddd7] bg-[#f2f1ec] p-6 dark:border-zinc-800 dark:bg-zinc-950 md:border-l md:border-t-0"><p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a8983]">即時預覽</p><div className="grid flex-1 place-items-center py-8"><ChordDiagram chord={{ name: newChordName || 'New', frets: newFrets }} size={230} theme={theme} variant="bare" /></div><button type="button" onClick={saveCustomChord} disabled={!newChordName.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-[#1b1c1e] py-3.5 text-sm font-semibold text-white transition hover:bg-[#3154d7] disabled:cursor-not-allowed disabled:bg-[#cfcec7] dark:bg-zinc-100 dark:text-zinc-950"><Plus size={17} /> 儲存到我的和弦</button></aside>
        </div>
      </div>}
    </div>
  );
};

export default ChordManager;
