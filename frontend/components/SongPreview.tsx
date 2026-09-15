import React, { useEffect, useMemo, useState } from 'react';
import { Anchor, ChevronDown, ChevronUp, Gauge, Layers3, RotateCcw } from 'lucide-react';
import { TabSection, ChordDefinition } from '../types';
import { formatPitch, parseChord, transposeChordSymbol, transposePitch } from '../music-theory';
import { renderTabNote } from '../services/tabNotation';
import ChordWorkspacePanel from './ChordWorkspacePanel';

interface SongPreviewProps {
  sections: TabSection[];
  customChords?: ChordDefinition[];
  globalChords?: ChordDefinition[];
  externalTranspose?: number;
  onTransposeChange?: (newVal: number) => void;
  theme?: 'light' | 'dark';
}

const transposeFret = (fretValue: string, semitones: number): string => {
  if (fretValue === '-' || fretValue === '·' || semitones === 0) return fretValue;
  const match = fretValue.match(/^(\d+)(.*)$/);
  if (!match) return fretValue;
  return `${Math.max(0, parseInt(match[1], 10) + semitones)}${match[2]}`;
};

const sectionAnchor = (id: string): string => `preview-section-${id}`;

const SongPreview: React.FC<SongPreviewProps> = ({
  sections,
  customChords = [],
  globalChords = [],
  externalTranspose = 0,
  onTransposeChange,
  theme = 'dark',
}) => {
  const [selectedChord, setSelectedChord] = useState<string | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const transpose = externalTranspose;
  const chordLibrary = useMemo(
    () => [...globalChords, ...customChords],
    [globalChords, customChords]
  );
  const chordNames = useMemo(() => Array.from(new Set(
    sections.flatMap(section => section.chords.flat()).filter((name): name is string => Boolean(name))
  )), [sections]);

  useEffect(() => {
    if (!selectedChord || !chordNames.includes(selectedChord)) {
      setSelectedChord(chordNames[0] ?? null);
    }
  }, [chordNames, selectedChord]);

  const renderedSections = useMemo(() => sections.map(section => ({
    ...section,
    measures: section.measures.map(measure =>
      measure.map(stringLine => stringLine.map(fret => transposeFret(fret, transpose)))
    ),
    displayChords: section.chords.map(measure =>
      measure.map(name => transposeChordSymbol(name, transpose))
    ),
  })), [sections, transpose]);

  const baseChord = chordNames.map(parseChord).find(chord => chord !== null) ?? null;
  const originalKey = baseChord ? formatPitch(baseChord.root, baseChord.accidentalPreference) : '—';
  const currentKey = baseChord
    ? formatPitch(transposePitch(baseChord.root, transpose), baseChord.accidentalPreference)
    : '—';
  const selectedDisplayChord = transposeChordSymbol(selectedChord, transpose);
  const capoValues = Array.from(new Set(sections.map(section => section.capo).filter(Boolean)));
  const capoLabel = capoValues.length === 0 ? '0' : capoValues.length === 1 ? String(capoValues[0]) : 'Varies';

  const chooseChord = (name: string) => {
    setSelectedChord(name);
    setMobilePanelOpen(true);
  };

  return (
    <div className="min-h-full bg-[#f6f6f3] text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="sticky top-0 z-30 border-b border-slate-200/90 bg-[#f6f6f3]/95 px-4 py-3 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-6 lg:px-10 print:hidden">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3">
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            <div className="flex shrink-0 items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <button type="button" onClick={() => onTransposeChange?.(Math.max(-12, transpose - 1))} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-zinc-800 dark:hover:text-violet-400" aria-label="Transpose down">
                <ChevronDown size={17} />
              </button>
              <div className="min-w-[92px] px-3 text-center">
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Key</div>
                <div className="font-mono text-base font-bold text-slate-900 dark:text-zinc-50">{currentKey}</div>
              </div>
              <button type="button" onClick={() => onTransposeChange?.(Math.min(12, transpose + 1))} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-zinc-800 dark:hover:text-violet-400" aria-label="Transpose up">
                <ChevronUp size={17} />
              </button>
            </div>

            <div className="shrink-0 text-xs leading-5 text-slate-500 dark:text-zinc-400">
              <span>Original {originalKey}</span>
              <span className="mx-2 text-slate-300 dark:text-zinc-700">·</span>
              <span className={transpose === 0 ? '' : 'font-semibold text-indigo-600 dark:text-violet-400'}>{transpose > 0 ? `+${transpose}` : transpose}</span>
            </div>
            <div className="h-7 w-px shrink-0 bg-slate-200 dark:bg-zinc-800" />
            <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-300"><Anchor size={14} className="text-slate-400" /> Capo {capoLabel}</div>
            <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-300"><Gauge size={14} className="text-slate-400" /> Standard tuning</div>
            {transpose !== 0 && (
              <button type="button" onClick={() => onTransposeChange?.(0)} className="ml-auto flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"><RotateCcw size={13} /> Reset</button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="mr-1 shrink-0 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Sections</span>
            {sections.map(section => (
              <button key={section.id} type="button" onClick={() => document.getElementById(sectionAnchor(section.id))?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="shrink-0 rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-slate-200 hover:bg-white hover:text-slate-900 dark:text-zinc-400 dark:hover:border-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-100">
                {section.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-8 px-4 pb-32 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-10 lg:pb-20 lg:pt-10 xl:gap-12">
        <div className="min-w-0">
          {chordNames.length > 0 && (
            <section className="mb-12 border-b border-slate-200 pb-8 dark:border-zinc-800 print:hidden">
              <div className="mb-4 flex items-center gap-2"><Layers3 size={15} className="text-indigo-500 dark:text-violet-400" /><h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">Chords used</h2></div>
              <div className="flex flex-wrap gap-2">
                {chordNames.map(name => {
                  const displayName = transposeChordSymbol(name, transpose) ?? name;
                  const isActive = selectedChord === name;
                  return (
                    <button key={name} type="button" onClick={() => chooseChord(name)} className={`rounded-full border px-4 py-2 font-mono text-sm font-semibold transition-all ${isActive ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-violet-800 dark:hover:text-violet-400'}`}>
                      {displayName}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <div className="space-y-16">
            {renderedSections.map((section, sectionIndex) => (
              <section key={section.id} id={sectionAnchor(section.id)} className="scroll-mt-36">
                <header className="mb-6 flex items-end justify-between gap-4 border-b border-slate-200 pb-4 dark:border-zinc-800">
                  <div><div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-zinc-500">Section {String(sectionIndex + 1).padStart(2, '0')}</div><h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">{section.title}</h2></div>
                  <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500"><span>{section.timeSignature?.join('/') ?? '4/4'}</span>{section.capo > 0 && <span>Capo {section.capo}</span>}</div>
                </header>

                <div className="space-y-5">
                  {section.measures.map((measure, measureIndex) => (
                    <div key={measureIndex} className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-zinc-800 dark:bg-zinc-900/45">
                      <div className="min-w-[720px] p-5 sm:p-6">
                        <div className="mb-1 flex items-center justify-between"><span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-600">Measure {measureIndex + 1}</span></div>
                        <div className="relative h-9">
                          {section.chords[measureIndex]?.map((originalName, columnIndex) => {
                            if (!originalName) return null;
                            const displayName = section.displayChords[measureIndex]?.[columnIndex] ?? originalName;
                            const isActive = selectedChord === originalName;
                            return (
                              <button key={columnIndex} type="button" onClick={() => chooseChord(originalName)} className={`absolute bottom-1 -translate-x-1/2 rounded-md px-1.5 py-0.5 font-mono text-sm font-bold transition-all ${isActive ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200 dark:bg-violet-950/70 dark:text-violet-300 dark:ring-violet-800' : 'text-indigo-600 hover:bg-indigo-50 dark:text-violet-400 dark:hover:bg-violet-950/40'}`} style={{ left: `${((columnIndex + 0.5) / 16) * 100}%` }}>
                                {displayName}
                              </button>
                            );
                          })}
                        </div>

                        <div className="relative flex h-[112px] flex-col justify-between py-2 font-mono">
                          {[0, 1, 2, 3, 4, 5].map(stringIndex => (
                            <div key={stringIndex} className="relative h-px bg-slate-200 dark:bg-zinc-700/80">
                              <span className="absolute -left-3 top-1/2 -translate-x-full -translate-y-1/2 text-[9px] text-slate-400 dark:text-zinc-600">{['e', 'B', 'G', 'D', 'A', 'E'][stringIndex]}</span>
                              {measure[stringIndex].map((note, columnIndex) => note !== '-' && note !== '·' ? (
                                <span key={columnIndex} className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded bg-white px-1 text-[11px] font-semibold text-slate-800 dark:bg-zinc-900 dark:text-zinc-100" style={{ left: `${((columnIndex + 0.5) / 16) * 100}%` }}>{renderTabNote(note)}</span>
                              ) : null)}
                            </div>
                          ))}
                        </div>

                        {section.lyrics[measureIndex]?.some(Boolean) && (
                          <div className="relative mt-5 h-8 border-t border-slate-100 pt-3 dark:border-zinc-800">
                            {section.lyrics[measureIndex].map((lyric, columnIndex) => lyric ? (
                              <span key={columnIndex} className="absolute whitespace-nowrap text-xs font-medium text-slate-600 dark:text-zinc-300" style={{ left: `${(columnIndex / 16) * 100}%` }}>{lyric}</span>
                            ) : null)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <aside className="hidden lg:block print:hidden">
          <div className="sticky top-36 max-h-[calc(100vh-10rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900">
            <ChordWorkspacePanel symbol={selectedDisplayChord} chordLibrary={chordLibrary} theme={theme} />
          </div>
        </aside>
      </div>

      {mobilePanelOpen && selectedDisplayChord && (
        <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/35 backdrop-blur-[2px] lg:hidden print:hidden" onClick={() => setMobilePanelOpen(false)}>
          <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-[28px] border-t border-slate-200 bg-white pt-3 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900" onClick={event => event.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 dark:bg-zinc-700" />
            <ChordWorkspacePanel symbol={selectedDisplayChord} chordLibrary={chordLibrary} theme={theme} compact onClose={() => setMobilePanelOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SongPreview;
