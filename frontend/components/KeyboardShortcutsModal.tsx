import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: ['0–9'], desc: '輸入品絲（支援雙位數，如 12）' },
  { keys: ['x'], desc: '悶弦' },
  { keys: ['s', '/'], desc: '滑音（在數字後追加，如 5s、5/）' },
  { keys: ['h'], desc: 'Hammer-on：先輸入起點品絲 → h → 目標品絲（例：5 → h → 7 → 5h7）' },
  { keys: ['p'], desc: 'Pull-off：先輸入起點品絲 → p → 目標品絲（例：7 → p → 5 → 7p5）' },
  { keys: ['b'], desc: 'Bend：先輸入起點品絲 → b → 目標音（例：7 → b → 9 → 7b9）' },
  { keys: ['Esc'], desc: '取消未完成的 h / p / b 輸入（7b → 7）' },
  { keys: ['↑', '↓', '←', '→'], desc: '移動游標（弦 / 拍）' },
  { keys: ['Tab'], desc: '下一拍' },
  { keys: ['Enter'], desc: '下一小節' },
  { keys: ['Backspace', 'Delete'], desc: '清除音符' },
  { keys: ['Ctrl/Cmd + Z'], desc: 'Undo' },
  { keys: ['Ctrl/Cmd + Y'], desc: 'Redo' },
  { keys: ['?'], desc: '開啟快捷鍵說明' },
  { keys: ['Toolbar'], desc: 'Edit 模式上方工具列：x / h / p / b / s / /，與鍵盤行為相同' },
];

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-violet-900/40 rounded-xl text-indigo-600 dark:text-violet-400">
              <Keyboard size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
          {shortcuts.map(item => (
            <div
              key={item.keys.join('-')}
              className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 dark:border-zinc-800/60 last:border-0"
            >
              <div className="flex flex-wrap gap-1.5">
                {item.keys.map(k => (
                  <kbd
                    key={k}
                    className="px-2 py-1 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-[11px] font-bold text-slate-600 dark:text-zinc-300"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
              <span className="text-sm text-slate-600 dark:text-zinc-400 text-right flex-shrink-0 max-w-[55%]">
                {item.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
