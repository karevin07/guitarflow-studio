import React, { useMemo, useState } from 'react';
import { Check, Volume2, X } from 'lucide-react';
import { ChordDefinition, TabSection, VocalRange } from '../types';
import { findChordVoicings } from '../guitar/voicing';
import { displaySpelling, primaryCapo, shiftedSongKey } from '../services/capoView';
import { previewPitch } from '../services/chordPreview';
import {
  GuitarOption,
  HIGHEST_NOTE,
  LOWEST_NOTE,
  SONG_PRESETS,
  VOICE_PRESETS,
  guitarOptions,
  keyLabel,
  keyTonic,
  loadVocalRange,
  noteName,
  normalizeSemitones,
  rankKeyShifts,
  saveVocalRange,
} from '../services/keySuggest';

interface KeySuggestModalProps {
  sections: TabSection[];
  transposeOffset: number;
  chordLibrary: ChordDefinition[];
  /** Key of the original recording from the song info, e.g. 'E'. */
  originalKey?: string;
  melodyRange: VocalRange | null;
  onSaveMelodyRange?: (range: VocalRange | null) => void;
  /** `assumedOriginalKey` is set when the song had no original key, so later suggestions keep the same reference. */
  onApply: (transpose: number, capo: number, assumedOriginalKey?: string) => void;
  onClose: () => void;
}

const NOTES = Array.from({ length: HIGHEST_NOTE - LOWEST_NOTE + 1 }, (_, index) => LOWEST_NOTE + index);

const RangePicker: React.FC<{
  label: string;
  hint: string;
  value: VocalRange | null;
  presets: Array<{ id: string; label: string; range: VocalRange }>;
  onChange: (range: VocalRange) => void;
}> = ({ label, hint, value, presets, onChange }) => {
  const select = (edge: 'low' | 'high', note: number) => {
    const base = value ?? presets[0].range;
    const next = { ...base, [edge]: note };
    if (next.low >= next.high) return;
    onChange(next);
  };
  return (
    <fieldset className="min-w-0 rounded-2xl border border-slate-200 p-4 dark:border-zinc-800">
      <legend className="px-1 text-sm font-bold">{label}</legend>
      <p className="text-[11px] text-slate-500 dark:text-zinc-400">{hint}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {presets.map(preset => {
          const active = value?.low === preset.range.low && value?.high === preset.range.high;
          return (
            <button key={preset.id} type="button" onClick={() => onChange(preset.range)} aria-pressed={active} className={`min-h-9 rounded-lg px-3 text-xs font-semibold ${active ? 'bg-[#4d5bd2] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200'}`}>
              {preset.label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(['low', 'high'] as const).map(edge => (
          <label key={edge} className="text-[11px] font-semibold text-slate-500">
            {edge === 'low' ? '最低音' : '最高音'}
            <div className="mt-1 flex items-center gap-1">
              <select
                value={value?.[edge] ?? ''}
                onChange={event => select(edge, Number(event.target.value))}
                aria-label={`${label}${edge === 'low' ? '最低音' : '最高音'}`}
                className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                {!value && <option value="">—</option>}
                {NOTES.map(note => <option key={note} value={note}>{noteName(note)}{note === 60 ? '（中央 C）' : ''}</option>)}
              </select>
              <button type="button" onClick={() => value && void previewPitch(value[edge])} disabled={!value} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-zinc-800" aria-label={`聽${label}${edge === 'low' ? '最低音' : '最高音'}`}>
                <Volume2 size={15} />
              </button>
            </div>
          </label>
        ))}
      </div>
    </fieldset>
  );
};

/** Suggest keys that suit the singer and capo positions that avoid barre chords. */
const KeySuggestModal: React.FC<KeySuggestModalProps> = ({
  sections, transposeOffset, chordLibrary, originalKey, melodyRange, onSaveMelodyRange, onApply, onClose,
}) => {
  const [singer, setSinger] = useState<VocalRange | null>(loadVocalRange);
  const [song, setSong] = useState<VocalRange | null>(melodyRange);

  const chordSymbols = useMemo(
    () => sections.flatMap(section => section.chords.flat()).filter((symbol): symbol is string => Boolean(symbol)),
    [sections]
  );
  const writtenKey = useMemo(() => shiftedSongKey(sections, 0), [sections]);
  const currentCapo = primaryCapo(sections);
  const minor = writtenKey?.mode === 'minor';
  // Compare keys by their relative major so "Am" and "C" count as the same key.
  const majorTonic = (tonic: number, isMinor: boolean) => tonic + (isMinor ? 3 : 0);
  const writtenSounding = writtenKey ? writtenKey.tonic + currentCapo : 0;
  const original = keyTonic(originalKey);
  const fromOriginal = original && writtenKey
    ? normalizeSemitones(majorTonic(writtenSounding, minor) - majorTonic(original.tonic, original.minor))
    : 0;

  const difficulty = useMemo(() => {
    const cache = new Map<string, number>();
    return (symbol: string) => {
      if (!cache.has(symbol)) {
        const shape = findChordVoicings(symbol, chordLibrary, undefined, { limit: 1 })?.shapes[0];
        cache.set(symbol, !shape ? 1 : shape.tags.includes('barre') ? 2 : shape.tags.includes('easy') ? 0 : 1);
      }
      return cache.get(symbol)!;
    };
  }, [chordLibrary]);

  const suggestions = useMemo(() => {
    if (!singer || !song || !writtenKey) return [];
    return rankKeyShifts(song, singer).slice(0, 3).map(fit => {
      // `fit.shift` moves the original recording; the stored chords may already sit elsewhere.
      const soundingShift = fit.shift - fromOriginal;
      const options = guitarOptions(chordSymbols, currentCapo, soundingShift, difficulty, transpose => displaySpelling(sections, transpose));
      return { fit, key: keyLabel(writtenSounding + soundingShift, minor), options: options.slice(0, 2) };
    });
  }, [singer, song, writtenKey, fromOriginal, chordSymbols, currentCapo, difficulty, sections, writtenSounding, minor]);

  const currentKey = writtenKey ? keyLabel(writtenSounding + transposeOffset, minor) : '—';
  // Without an original key, the chords as written (with their capo) are taken as the original.
  const assumedOriginalKey = !original && writtenKey ? keyLabel(writtenSounding, minor) : undefined;
  const updateSinger = (range: VocalRange) => {
    setSinger(range);
    saveVocalRange(range);
  };
  const updateSong = (range: VocalRange) => {
    setSong(range);
    onSaveMelodyRange?.(range);
  };
  const isCurrent = (option: GuitarOption) => option.transpose === transposeOffset && option.capo === currentCapo;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="找適合的調" onClick={event => event.stopPropagation()} className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] bg-[#fffefa] shadow-2xl dark:bg-zinc-900 sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold">找適合的調</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              目前唱 <span className="font-mono font-semibold">{currentKey}</span> 調{original ? `・原曲 ${originalKey} 調` : assumedOriginalKey ? `・沒有設定原曲調，先當作 ${assumedOriginalKey} 調` : ''}。依你的音域挑調，再找不用封閉和弦的 Capo 位置。
            </p>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label="關閉"><X size={18} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            <RangePicker label="我的音域" hint="唱起來舒服的最低和最高音，會記在這台裝置。" value={singer} presets={VOICE_PRESETS} onChange={updateSinger} />
            <RangePicker label="這首歌的音域" hint="原唱最低和最高的音；不確定就先選原唱性別估計。" value={song} presets={SONG_PRESETS} onChange={updateSong} />
          </div>

          {!writtenKey ? (
            <p className="py-8 text-center text-sm text-slate-400">這首歌還沒有和弦，無法判斷調性。</p>
          ) : suggestions.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">選好兩個音域，就會列出建議的調和 Capo。</p>
          ) : (
            <ol className="mt-5 space-y-3" aria-label="建議">
              {suggestions.map(({ fit, key, options }, index) => {
                const strain = fit.tooHigh > 0 ? `最高音會高出你的音域 ${fit.tooHigh} 個半音` : fit.tooLow > 0 ? `最低音會低於你的音域 ${fit.tooLow} 個半音` : '在你的音域內';
                const move = fit.shift === 0 ? '原調' : `比原調${fit.shift > 0 ? '高' : '低'} ${Math.abs(fit.shift)} 個半音`;
                return (
                  <li key={fit.shift} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950" data-testid="key-suggestion">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      {index === 0 && <span className="rounded-md bg-[#2b6c59] px-2 py-0.5 text-[11px] font-semibold text-white">最推薦</span>}
                      <h3 className="text-base font-bold">唱 <span className="font-mono">{key}</span> 調</h3>
                      <span className="text-xs text-slate-500">{move}</span>
                      <span className={`text-xs ${fit.tooHigh + fit.tooLow > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-[#2b6c59] dark:text-emerald-400'}`}>
                        {song && `${noteName(song.low + fit.shift)}–${noteName(song.high + fit.shift)}・`}{strain}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {options.map(option => (
                        <div key={option.capo} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-zinc-900">
                          <span className="w-16 shrink-0 text-sm font-semibold">{option.capo === 0 ? '不夾' : `Capo ${option.capo}`}</span>
                          <span className="min-w-0 flex-1 font-mono text-sm">
                            {option.shapes.slice(0, 8).map((shape, shapeIndex) => (
                              <span key={shape} className={option.hardShapes.includes(shape) ? 'text-amber-700 dark:text-amber-300' : 'text-indigo-600 dark:text-violet-400'}>
                                {shapeIndex > 0 && ' '}{shape}
                              </span>
                            ))}
                            {option.shapes.length > 8 && <span className="text-slate-400"> …</span>}
                          </span>
                          <span className="text-[11px] text-slate-500">{option.hardShapes.length === 0 ? '全部開放和弦' : `${option.hardShapes.length} 個較難`}</span>
                          {isCurrent(option) ? (
                            <span className="flex h-9 items-center gap-1 px-2 text-xs font-semibold text-[#2b6c59]"><Check size={14} />目前</span>
                          ) : (
                            <button type="button" onClick={() => onApply(option.transpose, option.capo, assumedOriginalKey)} className="h-9 rounded-lg bg-[#4d5bd2] px-3 text-xs font-semibold text-white hover:bg-[#3f4cc0]" aria-label={`套用 ${key} 調 ${option.capo === 0 ? '不夾' : `Capo ${option.capo}`}`}>套用</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="mt-4 text-[11px] text-slate-400">黃色是需要封閉或比較難按的和弦。套用會改掉移調和每一段的 Capo，之後隨時可以用上方的調性和 Capo 調回來。</p>
        </div>
      </div>
    </div>
  );
};

export default KeySuggestModal;
