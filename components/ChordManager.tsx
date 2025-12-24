
import React, { useState, useMemo } from 'react';
import { ChordDefinition } from '../types';
import { Trash2, Plus, Music, Search, Info, Grid, PenTool, Star } from 'lucide-react';
import ChordDiagram from './ChordDiagram';
import { COMMON_CHORDS } from '../constants';

interface ChordManagerProps {
  customChords: ChordDefinition[];
  onAddChord: (chord: ChordDefinition) => void;
  onDeleteChord: (name: string) => void;
}

const ChordManager: React.FC<ChordManagerProps> = ({ customChords, onAddChord, onDeleteChord }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'browse'>('browse');
  const [newChordName, setNewChordName] = useState('');
  const [newFrets, setNewFrets] = useState<(number | null)[]>([null, null, null, null, null, null]);
  const [searchTerm, setSearchTerm] = useState('');

  const fullLibrary = useMemo(() => [
    ...COMMON_CHORDS.map(c => ({ ...c, isStandard: true })),
    ...customChords.map(c => ({ ...c, isStandard: false }))
  ], [customChords]);

  const filteredChords = fullLibrary.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
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
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50/50">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Library Search</h3>
            <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full font-bold">
              {fullLibrary.length} Total
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              placeholder="Filter library..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
            />
          </div>
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button 
              onClick={() => setActiveTab('browse')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'browse' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Grid size={12} /> Browse
            </button>
            <button 
              onClick={() => setActiveTab('create')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'create' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <PenTool size={12} /> Create
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredChords.map(chord => (
            <div key={`${chord.isStandard ? 'std' : 'cust'}-${chord.name}`} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl group hover:border-orange-200 hover:shadow-md hover:shadow-orange-500/5 transition-all cursor-default">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex-shrink-0 bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center border border-slate-100">
                  <div className="transform scale-[0.35]">
                    <ChordDiagram chord={chord} size={100} />
                  </div>
                </div>
                <div>
                  <div className="font-bold text-slate-700 text-sm leading-none flex items-center gap-1.5">
                    {chord.name}
                    {chord.isStandard && <Star size={10} className="text-orange-400 fill-orange-400" />}
                  </div>
                  <span className="text-[9px] font-bold text-slate-300 uppercase">{chord.isStandard ? 'Standard' : 'Custom'}</span>
                </div>
              </div>
              {!chord.isStandard && (
                <button onClick={() => onDeleteChord(chord.name)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'browse' ? (
          <div className="p-12 max-w-7xl mx-auto">
            <header className="mb-10 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Chord Explorer</h2>
                <p className="text-sm text-slate-500 font-medium">Browse and manage your entire collection of guitar chords.</p>
              </div>
              <button 
                onClick={() => setActiveTab('create')}
                className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all"
              >
                <Plus size={18} /> New Chord
              </button>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredChords.map(chord => (
                <div key={`${chord.isStandard ? 'std' : 'cust'}-${chord.name}`} className="group bg-white border border-slate-200 rounded-[32px] p-6 hover:border-orange-500 hover:shadow-2xl hover:shadow-orange-500/10 transition-all">
                  <div className="h-48 mb-4 relative">
                    <ChordDiagram chord={chord} size={180} />
                    {chord.isStandard && (
                      <div className="absolute top-0 right-0 bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 border border-orange-200">
                        <Star size={10} fill="currentColor" /> Standard
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
                    <div className="font-black text-xl text-slate-800">{chord.name}</div>
                    {!chord.isStandard && (
                      <button 
                        onClick={() => onDeleteChord(chord.name)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-8 lg:p-12">
            <div className="w-full max-w-4xl bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col md:flex-row">
              {/* Creator Input */}
              <div className="flex-1 p-10 border-r border-slate-50">
                <header className="mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white">
                      <Plus size={18} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Chord Creator</h2>
                  </div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Define finger positions</p>
                </header>

                <div className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Chord Identity</label>
                    <input 
                      value={newChordName}
                      onChange={e => setNewChordName(e.target.value)}
                      placeholder="e.g. Amaj9"
                      className="w-full text-xl font-bold px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-orange-500 focus:bg-white outline-none transition-all"
                    />
                  </div>

                  <div className="relative pt-6">
                    <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                      <div className="flex justify-between mb-6 px-4">
                        {['e','B','G','D','A','E'].map(s => (
                          <span key={s} className="w-10 text-center text-xs font-black text-slate-500 uppercase">{s}</span>
                        ))}
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 flex flex-col justify-between py-5 pointer-events-none">
                          <div className="h-1.5 bg-slate-400 w-full rounded-full opacity-80" />
                          {[1,2,3,4,5].map(i => <div key={i} className="h-[1px] bg-slate-700 w-full" />)}
                        </div>
                        <div className="flex justify-between relative z-10 px-0">
                          {[0,1,2,3,4,5].map(sIdx => (
                            <div key={sIdx} className="flex flex-col items-center group/string">
                              <div className="absolute w-[1px] bg-slate-600 h-full top-0 z-0 group-hover/string:bg-orange-500/30 transition-colors" />
                              <div className="h-10 flex items-center justify-center z-10 mb-2">
                                <button 
                                  onClick={() => toggleFret(sIdx, newFrets[sIdx] === 0 ? null : 0)}
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black border-2 transition-all shadow-sm
                                    ${newFrets[sIdx] === 0 ? 'bg-orange-500 border-orange-500 text-white' : 
                                      newFrets[sIdx] === null ? 'bg-slate-800 border-slate-700 text-slate-500' : 
                                      'bg-slate-800 border-slate-700 text-slate-500'}
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
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border-2 z-10 transition-all
                                        ${newFrets[sIdx] === fIdx ? 
                                          'bg-white border-white text-orange-600 shadow-lg scale-110' : 
                                          'border-transparent text-transparent hover:border-white/20 hover:text-white/40'
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

              {/* Creator Preview */}
              <div className="w-full md:w-80 bg-slate-50/80 p-10 flex flex-col gap-8">
                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block text-center">Live Visualization</span>
                  <div className="bg-white p-2 rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 flex-1 flex items-center justify-center">
                    <ChordDiagram chord={{ name: newChordName || 'New Chord', frets: newFrets }} size={200} />
                  </div>
                </div>
                <div className="space-y-3">
                  <button 
                    onClick={handleSave}
                    disabled={!newChordName.trim()}
                    className="w-full py-5 bg-slate-900 hover:bg-black disabled:bg-slate-200 text-white rounded-[24px] font-bold shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 transition-all active:scale-95 group"
                  >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                    Save Chord
                  </button>
                  <button 
                    onClick={() => setActiveTab('browse')}
                    className="w-full py-4 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest transition-colors"
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
