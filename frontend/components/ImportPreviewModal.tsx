import React, { useEffect, useState } from 'react';
import { FileMusic, X } from 'lucide-react';
import AlphaTabViewer from './AlphaTabViewer';
import { detectImportFormat } from '../services/gpImport';

interface ImportPreviewModalProps {
  file: File;
  onConfirm: (title: string) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  file,
  onConfirm,
  onCancel,
  onError,
}) => {
  const [scoreData, setScoreData] = useState<ArrayBuffer | null>(null);
  const [scoreTitle, setScoreTitle] = useState(file.name.replace(/\.[^.]+$/, ''));
  const [loading, setLoading] = useState(true);

  const importFormat = detectImportFormat(file.name);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    file.arrayBuffer()
      .then(buf => {
        if (!cancelled) setScoreData(buf);
      })
      .catch(() => {
        if (!cancelled) onError('Failed to read file.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file, onError]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-preview-title"
        className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
              <FileMusic size={20} />
            </div>
            <div className="min-w-0">
              <h2 id="import-preview-title" className="text-lg font-bold text-slate-800 dark:text-zinc-100 truncate">
                Import Preview
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                {file.name} · {importFormat.toUpperCase()}
                {scoreTitle && scoreTitle !== file.name ? ` · ${scoreTitle}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all"
            title="Cancel"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto min-h-[360px]">
          {loading && (
            <div className="p-16 text-center text-slate-400 dark:text-zinc-500 font-medium">
              Reading file…
            </div>
          )}
          {!loading && scoreData && (
            <AlphaTabViewer
              data={scoreData}
              onScoreLoaded={title => {
                if (title) setScoreTitle(title);
              }}
              onError={onError}
            />
          )}
          {!loading && !scoreData && (
            <div className="p-16 text-center text-slate-400 dark:text-zinc-500 font-medium">
              Could not load preview.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/50">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(scoreTitle.trim() || file.name.replace(/\.[^.]+$/, ''))}
            disabled={loading || !scoreData}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-95 disabled:opacity-40 transition-all shadow-md"
          >
            Import to Library
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportPreviewModal;
