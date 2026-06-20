
import React, { useMemo } from 'react';
import { TabSection, ChordDefinition } from '../types';
import ChordDiagram from './ChordDiagram';
import { Anchor, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';

interface SongPreviewProps {
  sections: TabSection[];
  customChords?: ChordDefinition[];
  globalChords?: ChordDefinition[];
  externalTranspose?: number;
  onTransposeChange?: (newVal: number) => void;
  theme?: 'light' | 'dark';
}

const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const flatMap: Record<string, string> = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };

const transposeChordName = (name: string | null, semitones: number): string | null => {
  if (!name || semitones === 0) return name;
  const match = name.match(/^([A-G][#b]?)(.*)/);
  if (!match) return name;

  let root = match[1];
  const quality = match[2];

  if (flatMap[root]) root = flatMap[root];

  const index = chromaticScale.indexOf(root);
  if (index === -1) return name;

  const newIndex = (index + semitones + 120) % 12;
  const newRoot = chromaticScale[newIndex];

  return `${newRoot}${quality}`;
};

const transposeFret = (fretStr: string, semitones: number): string => {
  if (fretStr === '-' || fretStr === '·' || semitones === 0) return fretStr;
  
  // Isolate number from potential suffixes like 's' or '/'
  const match = fretStr.match(/^(\d+)(.*)$/);
  if (!match) return fretStr; // It's just 's' or '/' or invalid

  const fret = parseInt(match[1], 10);
  const suffix = match[2];
  
  const newFret = fret + semitones;
  return (newFret < 0 ? '0' : newFret.toString()) + suffix;
};

const SongPreview: React.FC<SongPreviewProps> = ({ 
  sections, 
  customChords = [], 
  globalChords = [],
  externalTranspose = 0,
  onTransposeChange,
  theme = 'dark'
}) => {
  const transpose = externalTranspose;

  // Combine libraries
  const chordLibrary = useMemo(() => [...globalChords, ...customChords], [globalChords, customChords]);

  // Pre-process all sections for the preview
  const renderedSections = useMemo(() => {
    return sections.map(section => {
      const transposedMeasures = section.measures.map(measure => 
        measure.map(stringLine => 
          stringLine.map(fret => transposeFret(fret, transpose))
        )
      );

      const transposedChordsGrid = section.chords.map(measure => 
        measure.map(name => transposeChordName(name, transpose))
      );

      // Group into rows of 2 measures
      const rows = [];
      for (let i = 0; i < transposedMeasures.length; i += 2) {
        rows.push({
          measures: transposedMeasures.slice(i, i + 2),
          chords: transposedChordsGrid.slice(i, i + 2),
          lyrics: section.lyrics.slice(i, i + 2),
          startIndex: i
        });
      }

      return {
        id: section.id,
        title: section.title,
        capo: section.capo,
        rows,
        transposedChordsGrid
      };
    });
  }, [sections, transpose]);

  // Aggregate unique chords from ALL sections
  const allUniqueTransposedNames = useMemo(() => {
    const allNames = renderedSections.flatMap(s => s.transposedChordsGrid.flat());
    const filtered = allNames.filter((c): c is string => c !== null);
    return Array.from(new Set(filtered));
  }, [renderedSections]);

  const renderFretValue = (fret: string) => {
    const parts = fret.split(/([s/])/);
    if (parts.length > 1) {
      return (
        <span className="text-indigo-600 dark:text-violet-400 font-bold">
          {parts[0]}
          <span className="text-pink-500 dark:text-fuchsia-400 italic text-[9px] ml-[0.5px]">{parts[1]}</span>
        </span>
      );
    }
    return <span className="text-slate-800 dark:text-zinc-200 font-bold">{fret}</span>;
  };

  return (
    <div className="bg-white/85 dark:bg-zinc-900/20 backdrop-blur-md min-h-full p-6 md:p-12 shadow-xl dark:shadow-2xl rounded-3xl border border-slate-200 dark:border-zinc-800/60 animate-in fade-in slide-in-from-bottom-4 duration-700 transition-colors duration-250">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-16">
        
        <div className="flex-1 space-y-20">
          {renderedSections.map((section, sIdx) => (            <div key={section.id} className="animate-in fade-in duration-500">
              <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Section {sIdx + 1}</span>
                    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-zinc-800" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800 dark:text-zinc-100 uppercase tracking-tight mb-2">{section.title}</h2>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Standard Tuning</span>
                    {section.capo > 0 && (
                      <>
                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800" />
                        <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-100 dark:bg-zinc-950 text-slate-600 dark:text-zinc-350 rounded border border-slate-200 dark:border-zinc-800 text-[10px] font-bold uppercase">
                          <Anchor size={10} className="text-indigo-600 dark:text-violet-400" />
                          Capo {section.capo}
                        </div>
                      </>
                    )}
                    {transpose !== 0 && (
                      <>
                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800" />
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-violet-400 uppercase tracking-widest bg-indigo-50 dark:bg-violet-900/45 px-2.5 py-1 rounded border border-indigo-100 dark:border-violet-900/30">
                          Transposed: {transpose > 0 ? `+${transpose}` : transpose}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </header>

              <div className="space-y-16">
                {section.rows.map((row, rIdx) => (
                  <div key={rIdx} className="flex gap-0 relative bg-slate-50/50 dark:bg-zinc-900/45 border border-slate-200/70 dark:border-zinc-800 rounded-2xl p-6 shadow-inner transition-colors duration-250">
                    <div className="flex flex-col justify-between h-[120px] pt-8 pb-1 pr-4 border-r border-slate-200 dark:border-zinc-800 flex-shrink-0">
                      <span className="text-[14px] font-bold text-slate-400 dark:text-zinc-500 leading-none">T</span>
                      <span className="text-[14px] font-bold text-slate-400 dark:text-zinc-500 leading-none">A</span>
                      <span className="text-[14px] font-bold text-slate-500 dark:text-zinc-600 leading-none">B</span>
                    </div>

                    <div className="flex-1 grid grid-cols-2 gap-0 border-r border-slate-200 dark:border-zinc-800/80">
                      {row.measures.map((measure, mIdxInRow) => {
                        const mIdx = row.startIndex + mIdxInRow;
                        return (
                          <div key={mIdx} className="relative group border-r border-slate-200 dark:border-zinc-800/50 last:border-r-0">
                            <div className="absolute -top-6 left-2 text-[9px] font-bold text-slate-400 dark:text-zinc-600">
                              M-{mIdx + 1}
                            </div>
                            
                            <div className="h-10 relative">
                              {row.chords[mIdxInRow].map((chordName, cIdx) => (
                                chordName && (
                                  <span 
                                    key={cIdx} 
                                    className="text-[14px] font-bold text-indigo-600 dark:text-violet-400 absolute whitespace-nowrap bottom-1 animate-in fade-in slide-in-from-top-1 duration-305 transform -translate-x-1/2"
                                    style={{ left: `${((cIdx + 0.5) / 16) * 100}%` }}
                                  >
                                    {chordName}
                                  </span>
                                )
                              ))}
                            </div>

                            <div className="relative h-[120px] flex flex-col justify-between py-1 bg-slate-50/20 dark:bg-zinc-900/10">
                               {[0, 1, 2, 3, 4, 5].map(s => (
                                 <div key={s} className="h-[1px] bg-slate-200 dark:bg-zinc-800 w-full relative">
                                    {measure[s].map((note, cIdx) => (
                                      (note !== '-' && note !== '·') && (
                                        <span 
                                          key={cIdx} 
                                          className="absolute bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 px-1.5 rounded text-[12px] font-mono font-bold text-slate-800 dark:text-zinc-100 transform -translate-y-1/2 -translate-x-1/2 z-10 whitespace-nowrap shadow-sm" 
                                          style={{ left: `${((cIdx + 0.5) / 16) * 100}%` }}
                                        >
                                          {renderFretValue(note)}
                                        </span>
                                      )
                                    ))}
                                 </div>
                               ))}
                            </div>

                            <div className="relative h-12 mt-4 overflow-visible">
                               {row.lyrics[mIdxInRow] && row.lyrics[mIdxInRow].map((lyric, cIdx) => (
                                 lyric && (
                                    <span 
                                      key={cIdx} 
                                      className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 absolute whitespace-nowrap italic transform -translate-x-1/2"
                                      style={{ left: `${((cIdx + 0.5) / 16) * 100}%` }}
                                    >
                                      {lyric}
                                    </span>
                                 )
                               ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <aside className="w-full lg:w-48 flex-shrink-0 space-y-6">
          {/* Transpose Tool */}
          <div className="sticky top-24 space-y-6">
            <div className="bg-white/70 dark:bg-zinc-900/40 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/85 dark:border-zinc-800/80 shadow-md transition-colors duration-250 print:hidden">

              <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-4 text-center leading-tight">Transposition</h3>
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-950 p-2 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-inner w-full justify-between">
                  <button 
                    onClick={() => onTransposeChange?.(Math.max(-12, transpose - 1))}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-400 hover:text-indigo-600 dark:text-zinc-500 dark:hover:text-violet-400 rounded-lg transition-all"
                    title="Transpose Down"
                  >
                    <ChevronDown size={18} />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase leading-none mb-1">Shift</span>
                    <span className={`text-sm font-bold leading-none ${transpose === 0 ? 'text-slate-400 dark:text-zinc-650' : 'text-indigo-600 dark:text-violet-400'}`}>
                      {transpose > 0 ? `+${transpose}` : transpose}
                    </span>
                  </div>
                  <button 
                    onClick={() => onTransposeChange?.(Math.min(12, transpose + 1))}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-400 hover:text-indigo-600 dark:text-zinc-500 dark:hover:text-violet-400 rounded-lg transition-all"
                    title="Transpose Up"
                  >
                    <ChevronUp size={18} />
                  </button>
                </div>
                {transpose !== 0 && (
                  <button 
                    onClick={() => onTransposeChange?.(0)}
                    className="w-full py-2 bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={12} /> Reset Key
                  </button>
                )}
              </div>
            </div>            <div className="bg-white/70 dark:bg-zinc-900/40 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/85 dark:border-zinc-800/80 transition-colors duration-250">
              <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-6 text-center leading-tight">Song Chord Shapes</h3>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                {allUniqueTransposedNames.length > 0 ? (
                  allUniqueTransposedNames.map((name) => {
                    const chordDef = chordLibrary.find(c => c.name === name);
                    return (
                      <div key={name} className="flex flex-col items-center">
                        <div className="transform scale-[0.75] origin-top opacity-100 transition-all duration-500">
                          {chordDef ? (
                            <ChordDiagram chord={chordDef} size={130} theme={theme} />
                          ) : (
                            <div className="w-[130px] h-[150px] bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-4 text-center shadow-sm">
                              <span className="text-xl font-bold text-slate-700 dark:text-zinc-200 mb-2">{name}</span>
                              <span className="text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-none text-balance">Shape not found</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-widest italic">No Chords</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
};
export default SongPreview;
