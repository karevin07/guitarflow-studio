
import React from 'react';

interface FretboardProps {
  onNoteClick: (string: number, fret: number) => void;
}

const Fretboard: React.FC<FretboardProps> = ({ onNoteClick }) => {
  const strings = [0, 1, 2, 3, 4, 5];
  const frets = Array.from({ length: 13 }, (_, i) => i);

  return (
    <div className="bg-amber-900/10 p-4 rounded-xl border border-amber-900/20 overflow-x-auto">
      <div className="relative inline-block min-w-full">
        {/* Strings */}
        {strings.map((s) => (
          <div key={s} className="relative h-8 flex items-center">
            <div className="absolute w-full h-[1px] bg-slate-400 shadow-sm" style={{ top: '50%' }} />
            {frets.map((f) => (
              <button
                key={f}
                onClick={() => onNoteClick(s, f)}
                className="z-10 w-10 h-10 -ml-5 first:ml-0 flex items-center justify-center group relative"
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                   <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                    {f}
                   </div>
                </div>
                {/* Fret marker dots */}
                {[3, 5, 7, 9, 12].includes(f) && s === 2 && (
                  <div className="absolute w-2 h-2 bg-slate-300 rounded-full -bottom-4" />
                )}
                {f === 12 && s === 4 && (
                  <div className="absolute w-2 h-2 bg-slate-300 rounded-full -bottom-4" />
                )}
              </button>
            ))}
          </div>
        ))}
        
        {/* Fret Bars */}
        <div className="absolute inset-0 pointer-events-none flex">
          {frets.map((f) => (
            <div key={f} className="w-10 border-r border-slate-300 first:border-l first:border-l-4 first:border-l-slate-800" />
          ))}
        </div>

        {/* Labels */}
        <div className="flex mt-2 ml-5">
           {frets.map(f => (
             <span key={f} className="w-10 text-center text-[10px] text-slate-500 font-medium">{f}</span>
           ))}
        </div>
      </div>
    </div>
  );
};

export default Fretboard;
