
import React, { useState } from 'react';
import { Music, Plus, Search, Clock, FileText, Trash2, Edit2, Play } from 'lucide-react';
import { GuitarSong } from '../types';

interface HomeProps {
  songs: GuitarSong[];
  onCreateNew: () => void;
  onOpen: (song: GuitarSong) => void;
  onDelete: (id: string) => void;
}

const Home: React.FC<HomeProps> = ({ songs, onCreateNew, onOpen, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSongs = songs.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-orange-500 p-3 rounded-2xl text-white shadow-xl shadow-orange-500/20">
              <Music size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">GuitarFlow</h1>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">My Song Library</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                placeholder="Search my scores..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none transition-all font-medium"
              />
            </div>
            <button 
              onClick={onCreateNew}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-2xl font-black shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus size={20} /> Create New
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8 lg:p-12">
        {filteredSongs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredSongs.map(song => (
              <div 
                key={song.id}
                onClick={() => onOpen(song)}
                className="group bg-white border border-slate-200 rounded-[32px] p-6 hover:border-orange-500 hover:shadow-2xl hover:shadow-orange-500/10 transition-all cursor-pointer flex flex-col animate-in zoom-in-95 duration-300"
              >
                <div className="w-full h-40 bg-slate-50 rounded-2xl mb-6 flex items-center justify-center group-hover:bg-orange-50 transition-colors border border-slate-100 relative overflow-hidden">
                  <FileText size={48} className="text-slate-200 group-hover:text-orange-200 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-orange-500 text-white p-3 rounded-full shadow-lg">
                      <Play size={24} fill="currentColor" />
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-black text-slate-800 mb-2 truncate group-hover:text-orange-600 transition-colors">{song.title}</h3>
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">
                    <Clock size={14} />
                    {formatDate(song.lastModified)}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase">
                      {song.sections.length} Sections
                    </span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this song forever?')) onDelete(song.id);
                    }}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Delete Song"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 bg-slate-100 rounded-[32px] flex items-center justify-center text-slate-300">
              <Music size={48} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">
                {searchTerm ? 'No matches found' : 'Your library is empty'}
              </h2>
              <p className="text-slate-400 max-w-xs mx-auto">
                {searchTerm ? `We couldn't find any songs matching "${searchTerm}"` : 'Start your songwriting journey by creating your first guitar score.'}
              </p>
            </div>
            {!searchTerm && (
              <button 
                onClick={onCreateNew}
                className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all active:scale-95"
              >
                <Plus size={20} /> New Score
              </button>
            )}
          </div>
        )}
      </main>
      
      <footer className="py-12 border-t border-slate-200 text-center">
        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
          GuitarFlow Studio &bull; Crafting the future of guitar notation
        </p>
      </footer>
    </div>
  );
};

export default Home;
