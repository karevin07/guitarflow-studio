import React from 'react';

interface FretboardProps {
  onNoteClick: (string: number, fret: number) => void;
  selectedString?: number | null;
  selectedCol?: number | null;
}

const Fretboard: React.FC<FretboardProps> = ({ onNoteClick, selectedString, selectedCol }) => {
  const strings = [0, 1, 2, 3, 4, 5]; // 0 is high e, 5 is low E
  const frets = Array.from({ length: 13 }, (_, i) => i); // 0 (open) to 12

  // Standard tuning note names for display
  const stringNames = ['e', 'B', 'G', 'D', 'A', 'E'];
  // String thicknesses in pixels for realism (low E is thickest)
  const stringThickness = ['1px', '1.5px', '2px', '2.5px', '3px', '3.5px'];

  return (
    <div className="bg-slate-900 dark:bg-zinc-950 p-6 rounded-[24px] border border-slate-800 shadow-2xl overflow-x-auto transition-all duration-300">
      <div className="relative inline-block min-w-[700px] w-full py-4 select-none">
        
        {/* Fret Board Background Wood Texture Style */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border-y border-zinc-700/50 rounded-lg shadow-inner opacity-90" />

        {/* Fret Markers Inlay Dots (between frets) */}
        <div className="absolute inset-0 pointer-events-none flex">
          {frets.map((f) => {
            const hasSingleDot = [3, 5, 7, 9].includes(f);
            const hasDoubleDot = f === 12;
            
            return (
              <div 
                key={`inlay-${f}`} 
                className="w-12 flex-shrink-0 relative flex flex-col items-center justify-center"
                style={{ marginLeft: f === 0 ? '24px' : '0' }}
              >
                {hasSingleDot && (
                  <div className="w-2.5 h-2.5 bg-slate-350 dark:bg-zinc-300 rounded-full opacity-60 shadow-sm border border-black/10" style={{ transform: 'translateY(80px)' }} />
                )}
                {hasDoubleDot && (
                  <div className="flex flex-col gap-8" style={{ transform: 'translateY(80px)' }}>
                    <div className="w-2 h-2 bg-slate-350 dark:bg-zinc-300 rounded-full opacity-60 shadow-sm border border-black/10" />
                    <div className="w-2 h-2 bg-slate-350 dark:bg-zinc-300 rounded-full opacity-60 shadow-sm border border-black/10" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Fret Metal Bars */}
        <div className="absolute inset-0 pointer-events-none flex">
          {frets.map((f) => (
            <div 
              key={`bar-${f}`} 
              className={`w-12 flex-shrink-0 border-r border-amber-100/10 relative`}
              style={{ 
                marginLeft: f === 0 ? '24px' : '0',
                borderRight: f === 0 
                  ? '4px solid #475569' // Nut (Plastic/Bone)
                  : '2px solid #94a3b8' // Metal frets
              }}
            >
              {f > 0 && (
                // Fret reflection highlight
                <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/20" />
              )}
            </div>
          ))}
        </div>

        {/* Strings & Buttons */}
        <div className="relative z-10 flex flex-col gap-4">
          {strings.map((s) => (
            <div key={s} className="relative h-8 flex items-center">
              
              {/* Tuning label at the left */}
              <div className="absolute -left-4 w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 uppercase shadow-md z-20">
                {stringNames[s]}
              </div>

              {/* Real String Line */}
              <div 
                className="absolute left-6 right-0 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 dark:from-zinc-400 dark:via-zinc-500 dark:to-zinc-600 shadow-sm pointer-events-none" 
                style={{ 
                  height: stringThickness[s],
                  top: '50%',
                  transform: 'translateY(-50%)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.4)'
                }} 
              />

              {/* Fret Buttons */}
              <div className="flex pl-6 w-full">
                {frets.map((f) => {
                  const isSelected = selectedString === s;
                  
                  return (
                    <button
                      key={`btn-${s}-${f}`}
                      onClick={() => onNoteClick(s, f)}
                      className="w-12 h-8 flex-shrink-0 flex items-center justify-center group relative outline-none focus:outline-none"
                    >
                      {/* Active indicator or hover bubble */}
                      <div className="absolute w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white text-[11px] font-bold flex items-center justify-center shadow-lg shadow-indigo-500/30 scale-0 group-hover:scale-100 group-focus:scale-100 transition-all duration-150 z-20">
                        {f}
                      </div>

                      {/* Display Fret Number subtle indicator */}
                      <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-transparent group-focus:bg-transparent transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Fret Index Numbers at the bottom */}
        <div className="flex pl-12 mt-3 z-10 relative">
          {frets.map(f => (
            <span 
              key={`label-${f}`} 
              className="w-12 text-center text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-widest"
            >
              {f === 0 ? 'Open' : f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Fretboard;
