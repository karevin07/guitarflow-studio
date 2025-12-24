
import React, { useMemo, useState } from 'react';
import { TabSection, ChordDefinition } from '../types';
import ChordDiagram from './ChordDiagram';
import { COMMON_CHORDS } from '../constants';
import { ChevronUp, ChevronDown, RotateCcw, Anchor } from 'lucide-react';

interface SongPreviewProps {
  section: TabSection;
  customChords?: ChordDefinition[];
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
  const fret = parseInt(fretStr, 10);
  if (isNaN(fret)) return fretStr;
  
  const newFret = fret + semitones;
  return newFret < 0 ? '0' : newFret.toString(); // 不顯示負數，最少到空弦
};

const SongPreview: React.FC<SongPreviewProps> = ({ section, customChords = [] }) => {
  const [transpose, setTranspose] = useState(0);

  // 合併所有可用的和弦庫（標準 + 自定義）
  const chordLibrary = useMemo(() => [...COMMON_CHORDS, ...customChords], [customChords]);

  // 計算實際聽到的音高位移（包含 Capo 與 手動轉調）
  const totalShift = useMemo(() => transpose + section.capo, [transpose, section.capo]);

  // 1. 轉換後的小節數據（Fret 數字位移）
  const transposedMeasures = useMemo(() => {
    return section.measures.map(measure => 
      measure.map(stringLine => 
        stringLine.map(fret => transposeFret(fret, transpose))
      )
    );
  }, [section.measures, transpose]);

  // 2. 轉換後的和弦名稱（顯示於譜上）
  const transposedChordsGrid = useMemo(() => {
    return section.chords.map(measure => 
      measure.map(name => transposeChordName(name, transpose))
    );
  }, [section.chords, transpose]);

  // 3. 側邊欄顯示的新和弦指法（根據轉換後的名稱去 Library 抓）
  const uniqueTransposedNames = useMemo(() => {
    const names = transposedChordsGrid.flat().filter((c): c is string => c !== null);
    return Array.from(new Set(names));
  }, [transposedChordsGrid]);

  // 將小節分組顯示（每兩小節一行）
  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < transposedMeasures.length; i += 2) {
      result.push(transposedMeasures.slice(i, i + 2));
    }
    return result;
  }, [transposedMeasures]);

  return (
    <div className="bg-white min-h-full p-6 md:p-12 shadow-sm rounded-3xl border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-16">
        
        <div className="flex-1">
          <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2">{section.title}</h2>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="px-2 py-1 bg-orange-100 text-orange-600 text-[10px] font-black uppercase rounded">Guitar Tablature</span>
                <div className="h-4 w-[1px] bg-slate-200" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Standard Tuning</span>
                {section.capo > 0 && (
                  <>
                    <div className="h-4 w-[1px] bg-slate-200" />
                    <div className="flex items-center gap-2 px-2 py-1 bg-slate-900 text-white rounded text-[10px] font-black uppercase">
                      <Anchor size={10} />
                      Capo {section.capo}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 轉調控制器 */}
            <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200 flex items-center gap-1 self-start md:self-auto shadow-sm">
              <div className="px-3 py-1 mr-2 border-r border-slate-200">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Transpose Key</span>
                <span className={`text-sm font-black ${transpose === 0 ? 'text-slate-400' : 'text-orange-600'}`}>
                  {transpose > 0 ? `+${transpose}` : transpose} <span className="text-[9px] uppercase">semitones</span>
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <button 
                  onClick={() => setTranspose(prev => Math.min(12, prev + 1))}
                  className="p-1 hover:bg-white hover:text-orange-600 rounded-lg text-slate-400 transition-all active:scale-90"
                >
                  <ChevronUp size={16} strokeWidth={3} />
                </button>
                <button 
                  onClick={() => setTranspose(prev => Math.max(-12, prev - 1))}
                  className="p-1 hover:bg-white hover:text-orange-600 rounded-lg text-slate-400 transition-all active:scale-90"
                >
                  <ChevronDown size={16} strokeWidth={3} />
                </button>
              </div>
              <button 
                onClick={() => setTranspose(0)}
                disabled={transpose === 0}
                className="ml-1 p-2 bg-white text-slate-400 hover:text-slate-900 disabled:opacity-0 rounded-xl shadow-sm border border-slate-100 transition-all active:rotate-180"
                title="Reset Key"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </header>

          <div className="space-y-24">
            {rows.map((rowMeasures, rIdx) => (
              <div key={rIdx} className="flex gap-0 relative">
                <div className="flex flex-col justify-between h-[120px] pt-8 pb-1 pr-4 border-r-2 border-slate-900 flex-shrink-0">
                  <span className="text-[14px] font-black text-slate-800 leading-none">T</span>
                  <span className="text-[14px] font-black text-slate-800 leading-none">A</span>
                  <span className="text-[14px] font-black text-slate-800 leading-none">B</span>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-0 border-r-2 border-slate-900">
                  {rowMeasures.map((measure, mIdxInRow) => {
                    const realIdx = rIdx * 2 + mIdxInRow;
                    return (
                      <div key={realIdx} className="relative group border-r border-slate-200 last:border-r-0">
                        <div className="absolute -top-6 left-0 text-[10px] font-bold text-slate-300">
                          {realIdx + 1}
                        </div>
                        
                        <div className="h-10 relative">
                          {transposedChordsGrid[realIdx].map((chordName, cIdx) => (
                            chordName && (
                              <span 
                                key={cIdx} 
                                className="text-[14px] font-black text-orange-600 absolute whitespace-nowrap bottom-1 animate-in fade-in slide-in-from-top-1 duration-300"
                                style={{ left: `${(cIdx / 16) * 100}%`, transform: 'translateX(2px)' }}
                              >
                                {chordName}
                              </span>
                            )
                          ))}
                        </div>

                        <div className="relative h-[120px] flex flex-col justify-between py-1 bg-slate-50/30">
                           {[0, 1, 2, 3, 4, 5].map(s => (
                             <div key={s} className="h-[1px] bg-slate-200 w-full relative">
                                {measure[s].map((note, cIdx) => (
                                  (note !== '-' && note !== '·') && (
                                    <span 
                                      key={cIdx} 
                                      className="absolute bg-white px-1 text-[12px] font-mono font-bold text-slate-900 transform -translate-y-1/2 -translate-x-1/2 z-10" 
                                      style={{ left: `${(cIdx / 16) * 100}%` }}
                                    >
                                      {note}
                                    </span>
                                  )
                                ))}
                             </div>
                           ))}
                        </div>

                        <div className="relative h-12 mt-4 overflow-visible">
                           {section.lyrics[realIdx] && section.lyrics[realIdx].map((lyric, cIdx) => (
                             lyric && (
                               <span 
                                 key={cIdx} 
                                 className="text-[11px] font-bold text-slate-500 absolute whitespace-nowrap italic"
                                 style={{ left: `${(cIdx / 16) * 100}%`, transform: 'translateX(0px)' }}
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

        <aside className="w-full lg:w-40 flex-shrink-0">
          <div className="sticky top-8 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center leading-tight">Chord Shapes</h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              {uniqueTransposedNames.length > 0 ? (
                uniqueTransposedNames.map((name) => {
                  const chordDef = chordLibrary.find(c => c.name === name);
                  return (
                    <div key={name} className="flex flex-col items-center">
                      <div className="transform scale-[0.75] origin-top opacity-100 transition-all duration-500">
                        {chordDef ? (
                          <ChordDiagram chord={chordDef} size={130} />
                        ) : (
                          <div className="w-[130px] h-[150px] bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-4">
                            <span className="text-xl font-black text-slate-800 mb-2">{name}</span>
                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest text-center leading-none">Diagram not found</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center">
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">None</span>
                </div>
              )}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
};

export default SongPreview;
