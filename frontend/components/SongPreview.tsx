
import React, { useMemo } from 'react';
import { TabSection, ChordDefinition } from '../types';
import ChordDiagram from './ChordDiagram';
import { COMMON_CHORDS } from '../constants';
import { Anchor, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';

interface SongPreviewProps {
  sections: TabSection[];
  customChords?: ChordDefinition[];
  externalTranspose?: number;
  onTransposeChange?: (newVal: number) => void;
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
  externalTranspose = 0,
  onTransposeChange 
}) => {
  const transpose = externalTranspose;

  // Combine libraries
  const chordLibrary = useMemo(() => [...COMMON_CHORDS, ...customChords], [customChords]);

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
        <span className="text-violet-400 font-bold">
          {parts[0]}
          <span className="text-fuchsia-400 italic text-[9px] ml-[0.5px]">{parts[1]}</span>
        </span>
      );
    }
    return <span className="text-zinc-200 font-bold">{fret}</span>;
  };

  return (
    <div className="bg-zinc-900/20 backdrop-blur-md min-h-full p-6 md:p-12 shadow-2xl rounded-3xl border border-zinc-800/60 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-16">
        
        <div className="flex-1 space-y-20">
          {renderedSections.map((section, sIdx) => (
            <div key={section.id} className="animate-in fade-in duration-500">
              <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest">Section {sIdx + 1}</span>
                    <div className="h-[1px] flex-1 bg-zinc-850" />
                  </div>
                  <h2 className="text-3xl font-bold text-zinc-150 uppercase tracking-tight mb-2">{section.title}</h2>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Standard Tuning</span>
                    {section.capo > 0 && (
                      <>
                        <div className="h-4 w-[1px] bg-zinc-800" />
                        <div className="flex items-center gap-2 px-2.5 py-1 bg-zinc-950 text-zinc-350 rounded border border-zinc-800 text-[10px] font-bold uppercase">
                          <Anchor size={10} className="text-violet-400" />
                          Capo {section.capo}
                        </div>
                      </>
                    )}
                    {transpose !== 0 && (
                      <>
                        <div className="h-4 w-[1px] bg-zinc-800" />
                        <span className="text-[10px] font-bold text-violet-450 uppercase tracking-widest bg-violet-950/45 px-2.5 py-1 rounded border border-violet-900/30">
                          Transposed: {transpose > 0 ? `+${transpose}` : transpose}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </header>

              <div className="space-y-16">
                {section.rows.map((row, rIdx) => (
                  <div key={rIdx} className="flex gap-0 relative bg-zinc-950/45 border border-zinc-850 rounded-2xl p-6 shadow-inner">
                    <div className="flex flex-col justify-between h-[120px] pt-8 pb-1 pr-4 border-r border-zinc-800 flex-shrink-0">
                      <span className="text-[14px] font-bold text-zinc-500 leading-none">T</span>
                      <span className="text-[14px] font-bold text-zinc-550 leading-none">A</span>
                      <span className="text-[14px] font-bold text-zinc-600 leading-none">B</span>
                    </div>

                    <div className="flex-1 grid grid-cols-2 gap-0 border-r border-zinc-800/80">
                      {row.measures.map((measure, mIdxInRow) => {
                        const mIdx = row.startIndex + mIdxInRow;
                        return (
                          <div key={mIdx} className="relative group border-r border-zinc-800/50 last:border-r-0">
                            <div className="absolute -top-6 left-2 text-[9px] font-bold text-zinc-600">
                              M-{mIdx + 1}
                            </div>
                            
                            <div className="h-10 relative">
                              {row.chords[mIdxInRow].map((chordName, cIdx) => (
                                chordName && (
                                  <span 
                                    key={cIdx} 
                                    className="text-[14px] font-bold text-violet-400 absolute whitespace-nowrap bottom-1 animate-in fade-in slide-in-from-top-1 duration-300 transform -translate-x-1/2"
                                    style={{ left: `${((cIdx + 0.5) / 16) * 100}%` }}
                                  >
                                    {chordName}
                                  </span>
                                )
                              ))}
                            </div>

                            <div className="relative h-[120px] flex flex-col justify-between py-1 bg-zinc-950/10">
                               {[0, 1, 2, 3, 4, 5].map(s => (
                                 <div key={s} className="h-[1px] bg-zinc-850 w-full relative">
                                    {measure[s].map((note, cIdx) => (
                                      (note !== '-' && note !== '·') && (
                                        <span 
                                          key={cIdx} 
                                          className="absolute bg-zinc-950 border border-zinc-800 px-1.5 rounded text-[12px] font-mono font-bold text-zinc-100 transform -translate-y-1/2 -translate-x-1/2 z-10 whitespace-nowrap shadow-md" 
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
                                      className="text-[10px] font-medium text-zinc-400 absolute whitespace-nowrap italic transform -translate-x-1/2"
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
          {/* Transpose Tool - Now exclusively here */}
          <div className="sticky top-24 space-y-6">
            <div className="bg-zinc-900/40 backdrop-blur-sm p-4 rounded-2xl border border-zinc-800/80 shadow-md">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 text-center leading-tight">Transposition</h3>
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-850 shadow-inner w-full justify-between">
                  <button 
                    onClick={() => onTransposeChange?.(Math.max(-12, transpose - 1))}
                    className="p-2 hover:bg-zinc-900 text-zinc-500 hover:text-violet-400 rounded-lg transition-all"
                    title="Transpose Down"
                  >
                    <ChevronDown size={18} />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-bold text-zinc-550 uppercase leading-none mb-1">Shift</span>
                    <span className={`text-sm font-bold leading-none ${transpose === 0 ? 'text-zinc-650' : 'text-violet-450'}`}>
                      {transpose > 0 ? `+${transpose}` : transpose}
                    </span>
                  </div>
                  <button 
                    onClick={() => onTransposeChange?.(Math.min(12, transpose + 1))}
                    className="p-2 hover:bg-zinc-900 text-zinc-500 hover:text-violet-400 rounded-lg transition-all"
                    title="Transpose Up"
                  >
                    <ChevronUp size={18} />
                  </button>
                </div>
                {transpose !== 0 && (
                  <button 
                    onClick={() => onTransposeChange?.(0)}
                    className="w-full py-2 bg-zinc-950 text-zinc-400 hover:text-zinc-200 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-zinc-850 hover:bg-zinc-900 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={12} /> Reset Key
                  </button>
                )}
              </div>
            </div>

            <div className="bg-zinc-900/40 backdrop-blur-sm p-4 rounded-2xl border border-zinc-800/80">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6 text-center leading-tight">Song Chord Shapes</h3>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                {allUniqueTransposedNames.length > 0 ? (
                  allUniqueTransposedNames.map((name) => {
                    const chordDef = chordLibrary.find(c => c.name === name);
                    return (
                      <div key={name} className="flex flex-col items-center">
                        <div className="transform scale-[0.75] origin-top opacity-100 transition-all duration-500">
                          {chordDef ? (
                            <ChordDiagram chord={chordDef} size={130} />
                          ) : (
                            <div className="w-[130px] h-[150px] bg-zinc-950 border border-zinc-850 rounded-2xl flex flex-col items-center justify-center p-4 text-center">
                              <span className="text-xl font-bold text-zinc-200 mb-2">{name}</span>
                              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest leading-none text-balance">Shape not found</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center">
                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest italic">No Chords</span>
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
