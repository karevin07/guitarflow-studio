export const segmentButton = (active: boolean) =>
  `h-8 rounded-lg px-3 text-[11px] font-semibold transition-colors ${active
    ? 'bg-[#fffefa] text-[#171a18] shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
    : 'text-[#777a73] hover:text-[#171a18] dark:text-zinc-500 dark:hover:text-zinc-100'}`;

export const segmentGroup = 'flex flex-wrap rounded-xl bg-[#efede7] p-1 dark:bg-zinc-800/60';

export const card = 'rounded-2xl border border-[#dedcd4] bg-[#fffefa] dark:border-zinc-800 dark:bg-zinc-900';

export const stepLabel = 'flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#85877f]';

export const stepNumber = 'grid h-5 w-5 place-items-center rounded-full bg-[#171a18] text-[11px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-950';
