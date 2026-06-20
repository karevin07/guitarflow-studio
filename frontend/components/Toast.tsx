import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const styles = {
    success: {
      container: 'bg-white dark:bg-zinc-900 border-emerald-500',
      icon: <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />,
      text: 'text-slate-700 dark:text-zinc-200',
    },
    error: {
      container: 'bg-white dark:bg-zinc-900 border-red-500',
      icon: <XCircle size={18} className="text-red-500 flex-shrink-0" />,
      text: 'text-slate-700 dark:text-zinc-200',
    },
    info: {
      container: 'bg-white dark:bg-zinc-900 border-indigo-500 dark:border-violet-500',
      icon: <Info size={18} className="text-indigo-500 dark:text-violet-400 flex-shrink-0" />,
      text: 'text-slate-700 dark:text-zinc-200',
    },
  };

  const s = styles[toast.type];

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-l-4 shadow-xl dark:shadow-2xl min-w-[280px] max-w-sm animate-in slide-in-from-right-4 fade-in duration-300 ${s.container}`}
      role="alert"
    >
      {s.icon}
      <p className={`text-sm font-semibold flex-1 ${s.text}`}>{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 text-slate-400 dark:text-zinc-600 hover:text-slate-700 dark:hover:text-zinc-300 rounded-lg transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
};
