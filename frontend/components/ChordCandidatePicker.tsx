import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { ChordDetectionResult } from '../services/chordDetector';

interface ChordCandidatePickerProps {
  result: ChordDetectionResult;
  currentName?: string | null;
  onConfirm: (name: string) => void;
  compact?: boolean;
}

const confidenceLabel = {
  high: '較明確',
  medium: '可能',
  low: '待確認',
};

const ChordCandidatePicker: React.FC<ChordCandidatePickerProps> = ({
  result,
  currentName,
  onConfirm,
  compact = false,
}) => {
  if (!result.frets.some(fret => fret !== null)) return null;

  return (
    <section aria-label="和弦辨識候選" className={`shrink-0 border-b border-slate-200 bg-indigo-50/50 dark:border-zinc-800 dark:bg-violet-950/10 ${compact ? 'rounded-2xl border px-4 py-4' : 'px-4 py-3 sm:px-6'}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-violet-300"><Sparkles size={14} /> 和弦辨識建議</div>
        <span className="text-[11px] text-slate-500 dark:text-zinc-400">音：{result.notes.join(' · ') || '—'}</span>
        {!currentName && <span className="text-[10px] text-slate-400 dark:text-zinc-500">尚未寫入譜面</span>}
      </div>
      {result.candidates.length > 0 ? (
        <div className={`mt-2 flex gap-2 overflow-x-auto pb-1 ${compact ? 'flex-wrap' : ''}`}>
          {result.candidates.map(candidate => {
            const selected = currentName === candidate.name;
            return (
              <button
                key={candidate.name}
                type="button"
                onClick={() => onConfirm(candidate.name)}
                title={candidate.reason}
                aria-label={`${selected ? '已採用' : '採用'} ${candidate.name}：${candidate.reason}`}
                className={`flex w-44 shrink-0 flex-col items-start gap-1 rounded-xl border px-3 py-2 text-left transition-colors ${selected ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-400 hover:text-indigo-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-violet-500'}`}
              >
                <span className="flex w-full items-center gap-1.5">
                  {selected && <Check size={13} />}
                  <span className="font-mono text-sm font-bold">{candidate.name}</span>
                  <span className="ml-auto text-[9px] font-semibold opacity-65">{candidate.exactShape ? '指法相同' : confidenceLabel[candidate.confidence]}</span>
                </span>
                <span className="text-[10px] leading-4 opacity-70">{candidate.reason}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">目前音符不足以判讀和弦；可繼續輸入，或自行填寫名稱。</p>
      )}
      {result.candidates.length > 1 && <p className="mt-1 text-[10px] text-slate-400 dark:text-zinc-500">同一組音可能對應不同和弦；點選候選名稱確認，不會改動原本的指法。</p>}
    </section>
  );
};

export default ChordCandidatePicker;
