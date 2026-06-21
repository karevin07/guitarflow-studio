import React, { useState } from 'react';
import { LogIn, UserPlus, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
}

const AuthModal: React.FC<AuthModalProps> = ({ open, onClose, onLogin, onRegister }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await onLogin(username.trim(), password);
      } else {
        await onRegister(username.trim(), password);
      }
      setUsername('');
      setPassword('');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-violet-900/40 rounded-xl text-indigo-600 dark:text-violet-400">
              {mode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100">
              {mode === 'login' ? '登入' : '註冊'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {error && (
            <p className="text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
              Username
            </span>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
              minLength={3}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-400 dark:focus:border-violet-600"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-400 dark:focus:border-violet-600"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl text-sm font-bold bg-indigo-600 dark:bg-violet-600 text-white hover:bg-indigo-700 dark:hover:bg-violet-500 disabled:opacity-50 transition-all"
          >
            {submitting ? '處理中…' : mode === 'login' ? '登入' : '建立帳號'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            className="w-full text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-violet-400"
          >
            {mode === 'login' ? '還沒有帳號？註冊' : '已有帳號？登入'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
