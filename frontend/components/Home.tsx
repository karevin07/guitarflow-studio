
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-violet-500/30 selection:text-violet-200">
      <header className="bg-zinc-900/50 backdrop-blur-xl border-b border-zinc-800/80 px-8 py-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-indigo-600 p-3 rounded-2xl text-white shadow-xl shadow-violet-500/20">
              <Music size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">GuitarFlow</h1>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">My Song Library</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                placeholder="Search my scores..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all font-medium"
              />
            </div>
            <button 
              onClick={onCreateNew}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:via-fuchsia-500 hover:to-indigo-500 transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap"
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
                className="group bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/80 rounded-[28px] p-6 hover:border-violet-500/60 hover:shadow-2xl hover:shadow-violet-500/10 hover:bg-zinc-900/80 transition-all duration-300 cursor-pointer flex flex-col animate-in zoom-in-95 duration-300"
              >
                <div className="w-full h-40 bg-zinc-950/80 rounded-2xl mb-6 flex items-center justify-center group-hover:bg-zinc-900 transition-colors border border-zinc-850 relative overflow-hidden">
                  <FileText size={48} className="text-zinc-800 group-hover:text-violet-400/40 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <div className="bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white p-3.5 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      <Play size={22} fill="currentColor" className="ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-bold text-zinc-100 mb-2 truncate group-hover:text-violet-400 transition-colors">{song.title}</h3>
                  <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-4">
                    <Clock size={14} />
                    {formatDate(song.lastModified)}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold bg-zinc-850 text-zinc-400 px-2.5 py-1 rounded-full border border-zinc-800 uppercase">
                      {song.sections?.length || 0} Sections
                    </span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this song forever?')) onDelete(song.id);
                    }}
                    className="p-2 text-zinc-650 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-all"
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
            <div className="w-24 h-24 bg-zinc-900 border border-zinc-850 rounded-[32px] flex items-center justify-center text-zinc-650 shadow-inner">
              <Music size={48} className="text-zinc-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-zinc-150 mb-2">
                {searchTerm ? 'No matches found' : 'Your library is empty'}
              </h2>
              <p className="text-zinc-500 max-w-xs mx-auto text-sm">
                {searchTerm ? `We couldn't find any songs matching "${searchTerm}"` : 'Start your songwriting journey by creating your first guitar score.'}
              </p>
            </div>
            {!searchTerm && (
              <button 
                onClick={onCreateNew}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:via-fuchsia-500 hover:to-indigo-500 transition-all hover:scale-[1.02]"
              >
                <Plus size={20} /> New Score
              </button>
            )}
          </div>
        )}
      </main>
      
      <footer className="py-12 border-t border-zinc-900 text-center">
        <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
          GuitarFlow Studio &bull; Crafting the future of guitar notation
        </p>
      </footer>
    </div>
  );
};

export default Home;
