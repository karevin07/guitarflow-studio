
import React, { useState, useMemo } from 'react';
import { ChordDefinition } from '../types';
import { Trash2, Plus, Music, Search, Info, Grid, PenTool, Star, X, Guitar } from 'lucide-react';
import ChordDiagram from './ChordDiagram';
import { TUNING_STANDARD } from '../constants';
import { detectChordName } from '../services/chordDetector';

interface ChordManagerProps {
  customChords: ChordDefinition[];
  globalChords?: ChordDefinition[];
  onAddChord: (chord: ChordDefinition) => void;
  onDeleteChord: (name: string) => void;
  theme?: 'light' | 'dark';
}

const ChordManager: React.FC<ChordManagerProps> = ({ 
  customChords, 
  globalChords = [],
  onAddChord, 
  onDeleteChord, 
  theme = 'dark' 
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'browse'>('browse');
  const [selectedChordName, setSelectedChordName] = useState<string | null>(null);
  const [newChordName, setNewChordName] = useState('');
  const [newFrets, setNewFrets] = useState<(number | null)[]>([null, null, null, null, null, null]);
  const [searchTerm, setSearchTerm] = useState('');

  const fullLibrary = useMemo(() => [
    ...globalChords.map(c => ({ ...c, isStandard: true })),
    ...customChords.map(c => ({ ...c, isStandard: false }))
  ], [globalChords, customChords]);

  const filteredChords = fullLibrary.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedChord = useMemo(() => 
    fullLibrary.find(c => c.name === selectedChordName), 
  [selectedChordName, fullLibrary]);

  const suggestedName = useMemo(
    () => detectChordName(newFrets, fullLibrary),
    [newFrets, fullLibrary]
  );

  const toggleFret = (sIdx: number, fIdx: number | null) => {
    const next = [...newFrets];
    if (next[sIdx] === fIdx) {
      if (fIdx === 0) next[sIdx] = null;
      else if (fIdx === null) next[sIdx] = 0;
      else next[sIdx] = 0;
    } else {
      next[sIdx] = fIdx;
    }
    setNewFrets(next);
  };

  const handleSave = () => {
    if (!newChordName.trim()) return;
    onAddChord({ name: newChordName, frets: newFrets });
    setNewChordName('');
    setNewFrets([null, null, null, null, null, null]);
    setActiveTab('browse');
    setSelectedChordName(newChordName);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f4f4f1] dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 transition-colors duration-250 lg:flex-row">
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            placeholder="Find a chord"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-violet-500"
          />
        </div>
        <button type="button" onClick={() => setActiveTab('browse')} className={`grid h-10 w-10 place-items-center rounded-xl ${activeTab === 'browse' ? 'bg-slate-950 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'text-slate-500'}`} aria-label="Browse chords"><Grid size={16} /></button>
        <button type="button" onClick={() => setActiveTab('create')} className={`grid h-10 w-10 place-items-center rounded-xl ${activeTab === 'create' ? 'bg-slate-950 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'text-slate-500'}`} aria-label="Create chord"><Plus size={16} /></button>
      </div>
      {/* Sidebar */}
      <aside className="hidden w-72 flex-col flex-shrink-0 border-r border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 transition-colors duration-250 lg:flex">
        <div className="p-6 border-b border-slate-200 dark:border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Library Search</h3>
            <span className="text-[10px] px-2.5 py-1 bg-indigo-50 dark:bg-violet-900/40 text-indigo-600 dark:text-violet-400 border border-indigo-100 dark:border-violet-800/50 rounded-full font-bold">
              {fullLibrary.length} Total
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" size={14} />
            <input 
              placeholder="Filter library..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-violet-500/20 focus:border-indigo-500 dark:focus:border-violet-500 outline-none transition-all"
            />
          </div>
          <div className="flex p-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl">
            <button 
              onClick={() => setActiveTab('browse')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${activeTab === 'browse' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-violet-400 border border-slate-200 dark:border-zinc-800 shadow-sm' : 'text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-300'}`}
            >
              <Grid size={12} /> Browse
            </button>
            <button 
              onClick={() => setActiveTab('create')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${activeTab === 'create' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-violet-400 border border-slate-200 dark:border-zinc-800 shadow-sm' : 'text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-300'}`}
            >
              <PenTool size={12} /> Create
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredChords.map(chord => (
            <div 
              key={`${chord.isStandard ? 'std' : 'cust'}-${chord.name}`} 
              onClick={() => setSelectedChordName(chord.name)}
              className={`flex items-center justify-between p-3 border rounded-2xl group transition-all cursor-pointer ${selectedChordName === chord.name ? 'border-indigo-500 bg-indigo-50/80 dark:border-violet-500/80 dark:bg-violet-500/10 shadow-sm' : 'bg-white/70 dark:bg-zinc-900/20 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-800 hover:bg-slate-50/50 dark:hover:bg-zinc-900/50'}`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 flex-shrink-0 bg-slate-50 dark:bg-zinc-950 rounded-lg overflow-hidden flex items-center justify-center border border-slate-100 dark:border-zinc-800">
                  <div className="transform scale-[0.35]">
                    <ChordDiagram chord={chord} size={100} theme={theme} />
                  </div>
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold text-slate-800 dark:text-zinc-200 text-sm leading-none flex items-center gap-1.5">
                    <span className="truncate">{chord.name}</span>
                    {chord.isStandard && <Star size={10} className="text-indigo-600 dark:text-violet-400 fill-indigo-600 dark:fill-violet-400 flex-shrink-0" />}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase">{chord.isStandard ? 'Standard' : 'Custom'}</span>
                </div>
              </div>
              {!chord.isStandard && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteChord(chord.name); if(selectedChordName === chord.name) setSelectedChordName(null); }} 
                  className="p-2 text-slate-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {activeTab === 'browse' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Chord Grid Explorer */}
            <div className="flex-1 overflow-y-auto p-4 transition-all duration-250 sm:p-8 lg:p-10">
              <header className="mb-8 flex items-end justify-between gap-4">
                <div>
                  <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-violet-400">Learn the shapes</div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight sm:text-3xl">Chord library</h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Explore fingerings or build one that fits your song.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('create')}
                  className="hidden items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-600 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-violet-400 sm:flex"
                >
                  <Plus size={18} /> New Chord
                </button>
              </header>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredChords.map(chord => (
                  <div 
                    key={`${chord.isStandard ? 'std' : 'cust'}-${chord.name}`} 
                    onClick={() => setSelectedChordName(chord.name)}
                    className={`group cursor-pointer rounded-2xl border bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-lg dark:bg-zinc-900/40 dark:hover:border-violet-600 sm:p-5 ${selectedChordName === chord.name ? 'ring-2 ring-indigo-500 dark:ring-violet-500 border-indigo-500 dark:border-violet-500' : 'border-slate-200 dark:border-zinc-800'}`}
                  >
                    <div className="relative h-36 sm:h-44">
                      <ChordDiagram chord={chord} size={160} theme={theme} />
                      {chord.isStandard && (
                        <div className="absolute top-0 right-0 bg-indigo-50/80 dark:bg-violet-900/50 text-indigo-600 dark:text-violet-400 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase flex items-center gap-1 border border-indigo-100 dark:border-violet-900">
                          <Star size={10} fill="currentColor" /> Standard
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800/50">
                      <div className="font-bold text-xl text-slate-800 dark:text-zinc-100 truncate pr-4">{chord.name}</div>
                      {!chord.isStandard && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteChord(chord.name); if(selectedChordName === chord.name) setSelectedChordName(null); }}
                          className="p-2 text-slate-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dedicated Detail Panel */}
            {selectedChord && (
              <aside className="fixed inset-3 top-20 z-[70] flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right duration-350 dark:border-zinc-800 dark:bg-zinc-900 sm:inset-y-4 sm:left-auto sm:right-4 sm:top-20 sm:w-[400px] lg:absolute lg:inset-y-0 lg:right-0 lg:top-0 lg:rounded-none lg:border-y-0 lg:border-r-0">
                <div className="p-6 border-b border-slate-200 dark:border-zinc-800/80 flex items-center justify-between bg-slate-50/35 dark:bg-zinc-900/30">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-600 dark:from-violet-600 dark:to-fuchsia-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/10 dark:shadow-violet-500/20">
                       <Guitar size={20} />
                     </div>
                     <div>
                       <h3 className="text-sm font-bold text-slate-600 dark:text-zinc-300 uppercase tracking-widest leading-none mb-1">Chord Details</h3>
                       <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-tighter">Technical View</span>
                     </div>
                   </div>
                   <button 
                    onClick={() => setSelectedChordName(null)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 transition-all"
                   >
                     <X size={20} />
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-10">
                   <div className="bg-slate-50 dark:bg-zinc-950 rounded-[32px] p-6 border border-slate-200 dark:border-zinc-800 shadow-inner flex flex-col items-center">
                     <ChordDiagram chord={selectedChord} size={280} theme={theme} />
                   </div>

                   <div className="space-y-6">
                     <div className="flex items-center justify-between">
                       <h4 className="text-3xl font-extrabold text-slate-800 dark:text-zinc-100 tracking-tight">{selectedChord.name}</h4>
                       <div className="flex items-center gap-2">
                         {selectedChord.isStandard ? (
                           <span className="px-3 py-1 bg-indigo-50/80 dark:bg-violet-900/45 text-indigo-600 dark:text-violet-400 text-[10px] font-bold uppercase rounded-full border border-indigo-100 dark:border-violet-900 flex items-center gap-1.5">
                             <Star size={10} fill="currentColor" /> Standard Library
                           </span>
                         ) : (
                           <span className="px-3 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 text-[10px] font-bold uppercase rounded-full border border-slate-200 dark:border-zinc-800">
                             Custom Asset
                           </span>
                         )}
                       </div>
                     </div>

                     <div className="grid grid-cols-1 gap-3">
                       <div className="p-5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl space-y-4 shadow-sm">
                         <div className="flex items-center justify-between">
                           <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Fret Configuration</span>
                           <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-400 italic">E to e standard</span>
                         </div>
                         <div className="grid grid-cols-6 gap-2">
                           {selectedChord.frets.map((fret, i) => (
                             <div key={i} className="flex flex-col items-center gap-1">
                               <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold border transition-all ${fret === null ? 'bg-slate-100/50 text-slate-400 border-slate-200 dark:bg-zinc-900/30 dark:text-zinc-600 dark:border-zinc-800' : 'bg-white text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 shadow-md dark:shadow-black/20'}`}>
                                 {fret === null ? 'X' : fret}
                               </div>
                               <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase">{TUNING_STANDARD[5-i]}</span>
                             </div>
                           ))}
                         </div>
                       </div>

                       <div className="grid grid-cols-2 gap-3">
                         <div className="p-5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm">
                           <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-2">Base Fret</span>
                           <div className="text-2xl font-extrabold text-slate-800 dark:text-zinc-200">
                             {Math.max(1, Math.min(...(selectedChord.frets.filter(f => f !== null && f > 0) as number[])) || 1)}
                           </div>
                         </div>
                         <div className="p-5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm">
                           <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-2">Span</span>
                           <div className="text-2xl font-extrabold text-slate-800 dark:text-zinc-200">
                             {(() => {
                               const frets = selectedChord.frets.filter(f => f !== null && f > 0) as number[];
                               if (frets.length === 0) return 1;
                               return Math.max(...frets) - Math.min(...frets) + 1;
                             })()} <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase">Frets</span>
                           </div>
                         </div>
                       </div>
                     </div>

                     {!selectedChord.isStandard && (
                       <button 
                        onClick={() => { onDeleteChord(selectedChord.name); setSelectedChordName(null); }}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 hover:bg-red-100 text-red-650 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all border border-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/30 dark:text-red-400 dark:border-red-900/50"
                       >
                         <Trash2 size={16} /> Delete from Library
                       </button>
                     )}
                   </div>
                </div>
              </aside>
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4 sm:flex sm:items-center sm:justify-center sm:p-8 lg:p-12">
            <div className="mx-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl animate-in zoom-in-95 duration-500 dark:border-zinc-800 dark:bg-zinc-900/40 md:flex-row">
              {/* Creator Input */}
              <div className="flex-1 border-b border-slate-200 p-5 dark:border-zinc-800 sm:p-8 md:border-b-0 md:border-r">
                <header className="mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-violet-600 dark:from-violet-600 dark:to-fuchsia-600 rounded-lg flex items-center justify-center text-white shadow-md">
                      <Plus size={18} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-zinc-100 tracking-tight">Chord Creator</h2>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-widest animate-pulse">Define finger positions</p>
                </header>

                <div className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3 ml-1">Chord Identity</label>
                    <input 
                      value={newChordName}
                      onChange={e => setNewChordName(e.target.value)}
                      placeholder="e.g. Amaj9"
                      className="w-full text-xl font-bold px-5 py-4 bg-slate-50 dark:bg-zinc-950 border-2 border-slate-200 dark:border-zinc-800 rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:border-violet-500 dark:focus:bg-zinc-900/80 text-slate-800 dark:text-zinc-100 outline-none transition-all"
                    />
                    {suggestedName && suggestedName !== newChordName && (
                      <div className="mt-2 flex items-center justify-between gap-2 px-1">
                        <span className="text-xs text-slate-500 dark:text-zinc-400">
                          Suggested: <span className="font-bold text-indigo-600 dark:text-violet-400">{suggestedName}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setNewChordName(suggestedName)}
                          className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-violet-400 hover:underline"
                        >
                          Use
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="relative pt-6">
                    <div className="bg-slate-50 dark:bg-zinc-950 rounded-[24px] p-8 border border-slate-200 dark:border-zinc-800 shadow-inner relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                      <div className="flex justify-between mb-6 px-4">
                        {['e','B','G','D','A','E'].map(s => (
                          <span key={s} className="w-10 text-center text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase">{s}</span>
                        ))}
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 flex flex-col justify-between py-5 pointer-events-none">
                          <div className="h-1.5 bg-indigo-500 dark:bg-violet-500/85 w-full rounded-full opacity-80" />
                          {[1,2,3,4,5].map(i => <div key={i} className="h-[1px] bg-slate-200 dark:bg-zinc-800 w-full" />)}
                        </div>
                        <div className="flex justify-between relative z-10 px-0">
                          {[0,1,2,3,4,5].map(sIdx => (
                            <div key={sIdx} className="flex flex-col items-center group/string">
                              <div className="absolute w-[1px] bg-slate-200 dark:bg-zinc-800 h-full top-0 z-0 group-hover/string:bg-indigo-500/30 dark:group-hover/string:bg-violet-500/30 transition-colors" />
                              <div className="h-10 flex items-center justify-center z-10 mb-2">
                                <button 
                                  onClick={() => toggleFret(sIdx, newFrets[sIdx] === 0 ? null : 0)}
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold border-2 transition-all shadow-md
                                    ${newFrets[sIdx] === 0 ? 'bg-indigo-600 border-indigo-600 dark:bg-violet-500 dark:border-violet-500 text-white shadow-lg shadow-indigo-500/20' : 
                                      newFrets[sIdx] === null ? 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 hover:border-slate-300 dark:hover:border-zinc-700' : 
                                      'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 hover:border-slate-300 dark:hover:border-zinc-700'}
                                  `}
                                >
                                  {newFrets[sIdx] === 0 ? 'O' : (newFrets[sIdx] === null ? 'X' : '·')}
                                </button>
                              </div>
                              <div className="flex flex-col gap-0">
                                {[1,2,3,4,5].map(fIdx => (
                                  <div key={fIdx} className="h-10 w-10 flex items-center justify-center relative">
                                    <button
                                      onClick={() => toggleFret(sIdx, fIdx)}
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 z-10 transition-all
                                        ${newFrets[sIdx] === fIdx ? 
                                          'bg-indigo-600 border-indigo-600 dark:bg-white dark:border-white text-white dark:text-zinc-900 shadow-xl scale-110' : 
                                          'border-transparent text-transparent hover:border-slate-200 hover:text-slate-500 dark:hover:border-zinc-800 dark:hover:text-zinc-500'
                                        }
                                      `}
                                    >
                                      {fIdx}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Creator Preview */}              <div className="flex w-full flex-col gap-6 bg-slate-50/40 p-5 dark:bg-zinc-900/30 sm:p-8 md:w-80">
                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-4 block text-center">Live Visualization</span>
                  <div className="bg-white dark:bg-zinc-950 p-2 rounded-[24px] border border-slate-200 dark:border-zinc-800 flex-1 flex items-center justify-center shadow-inner">
                    <ChordDiagram chord={{ name: newChordName || 'New Chord', frets: newFrets }} size={200} theme={theme} />
                  </div>
                </div>
                <div className="space-y-3">
                  <button 
                    onClick={handleSave}
                    disabled={!newChordName.trim()}
                    className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 py-4 font-bold text-white transition-all hover:bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-violet-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
                  >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                    Save Chord
                  </button>
                  <button 
                    onClick={() => setActiveTab('browse')}
                    className="w-full py-4 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 text-xs font-bold uppercase tracking-widest transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ChordManager;
