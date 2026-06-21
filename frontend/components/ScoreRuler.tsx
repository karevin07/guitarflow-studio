import React from 'react';

interface ScoreRulerProps {
  measureNumber: number;
  showTimeSignature?: boolean;
  timeSignature?: [number, number];
  className?: string;
}

const ScoreRuler: React.FC<ScoreRulerProps> = ({
  measureNumber,
  showTimeSignature = false,
  timeSignature = [4, 4],
  className = '',
}) => (
  <div
    className={`flex items-center gap-2 px-3 py-1.5 border-b border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/80 dark:bg-zinc-900/40 ${className}`}
  >
    <span className="text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 tabular-nums">
      {measureNumber}
    </span>
    {showTimeSignature && (
      <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
        {timeSignature[0]}/{timeSignature[1]}
      </span>
    )}
    <div className="flex-1 flex items-center gap-1 ml-1 opacity-40">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="flex-1 h-px bg-slate-300 dark:bg-zinc-700" />
      ))}
    </div>
  </div>
);

export default ScoreRuler;
