import React from 'react';
import {
  BookOpenText,
  GraduationCap,
  Library,
  Moon,
  Music2,
  Settings,
  Shapes,
  Sun,
  TimerReset,
} from 'lucide-react';

export type AppDestination = 'library' | 'read' | 'practice' | 'learn' | 'chords';

interface AppRailProps {
  active: AppDestination;
  theme: 'light' | 'dark';
  onNavigate: (destination: AppDestination) => void;
  onToggleTheme: () => void;
  username?: string | null;
}

const destinations = [
  { id: 'library' as const, label: '歌曲庫', icon: Library },
  { id: 'read' as const, label: '閱讀', icon: BookOpenText },
  { id: 'practice' as const, label: '練習', icon: TimerReset },
  { id: 'learn' as const, label: '學習', icon: GraduationCap },
  { id: 'chords' as const, label: '和弦庫', icon: Shapes },
];

const AppRail: React.FC<AppRailProps> = ({
  active,
  theme,
  onNavigate,
  onToggleTheme,
  username,
}) => (
  <aside className="fixed inset-y-0 left-0 z-[60] hidden w-[72px] flex-col border-r border-[#dedcd4] bg-[#fffefa] py-4 dark:border-zinc-800 dark:bg-[#171818] lg:flex print:hidden">
    <button
      type="button"
      onClick={() => onNavigate('library')}
      className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[#171a18] text-sm font-bold tracking-[-0.08em] text-white transition-colors hover:bg-[#4d5bd2] dark:bg-zinc-100 dark:text-zinc-950"
      aria-label="GuitarFlow home"
    >
      GF
    </button>

    <nav className="mt-7 flex flex-col gap-1 px-2">
      {destinations.map(item => {
        const Icon = item.icon;
        const selected = active === item.id;
        const practice = item.id === 'practice';
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[9px] font-semibold transition-colors ${selected
              ? practice
                ? 'bg-[#e8f0eb] text-[#2b6c59] dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-[#eceefa] text-[#4d5bd2] dark:bg-indigo-950/45 dark:text-indigo-300'
              : 'text-[#85877f] hover:bg-[#f3f1eb] hover:text-[#171a18] dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
            }`}
            aria-current={selected ? 'page' : undefined}
          >
            {selected && <span className={`absolute -left-2 top-3 h-8 w-0.5 rounded-r ${practice ? 'bg-[#2b6c59]' : 'bg-[#4d5bd2]'}`} />}
            <Icon size={18} strokeWidth={selected ? 2.4 : 1.8} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>

    <div className="mt-auto flex flex-col items-center gap-2">
      <button type="button" className="grid h-10 w-10 place-items-center rounded-xl text-[#85877f] hover:bg-[#f3f1eb] hover:text-[#171a18] dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-100" aria-label="Settings">
        <Settings size={17} />
      </button>
      <button type="button" onClick={onToggleTheme} className="grid h-10 w-10 place-items-center rounded-xl text-[#85877f] hover:bg-[#f3f1eb] hover:text-[#171a18] dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-100" aria-label="Toggle theme">
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <div className="grid h-9 w-9 place-items-center rounded-full border border-[#dedcd4] bg-white text-[10px] font-bold text-[#4d5bd2] dark:border-zinc-700 dark:bg-zinc-900 dark:text-indigo-300" title={username ?? 'Guest'}>
        {username ? username.slice(0, 1).toUpperCase() : <Music2 size={15} />}
      </div>
    </div>
  </aside>
);

export default AppRail;
