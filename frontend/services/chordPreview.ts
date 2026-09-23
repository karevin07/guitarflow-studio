const STRING_MIDI_PITCHES = [64, 59, 55, 50, 45, 40];

let audioContext: AudioContext | null = null;

export const voicingToMidiNotes = (
  frets: Array<number | null>,
  capo = 0,
  transpose = 0,
): Array<{ stringIndex: number; midi: number }> => frets.flatMap((fret, stringIndex) => (
  fret === null || STRING_MIDI_PITCHES[stringIndex] === undefined
    ? []
    : [{ stringIndex, midi: STRING_MIDI_PITCHES[stringIndex] + fret + capo + transpose }]
));

export const getAudioContext = async (): Promise<AudioContext> => {
  const AudioContextClass = window.AudioContext
    || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio API is unavailable');

  audioContext ??= new AudioContextClass();
  if (audioContext.state === 'suspended') await audioContext.resume();
  return audioContext;
};

/** One soft triangle-wave pluck; `length` is the ring time in seconds. */
export const pluck = (
  context: AudioContext,
  destination: AudioNode,
  midi: number,
  start: number,
  volume: number,
  length = 1.25,
): void => {
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(440 * Math.pow(2, (midi - 69) / 12), start);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2600, start);
  filter.frequency.exponentialRampToValueAtTime(900, start + Math.min(0.8, length));
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.01, Math.min(1, volume)) * 0.12, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  oscillator.start(start);
  oscillator.stop(start + length + 0.05);
};

/** Pluck MIDI notes; each note starts after its offset in seconds. */
const playPluckedNotes = async (
  notes: Array<{ midi: number; offset: number }>,
  volume: number,
): Promise<void> => {
  const context = await getAudioContext();
  const now = context.currentTime;
  notes.forEach(({ midi, offset }) => pluck(context, context.destination, midi, now + offset, volume));
};

export const previewChordVoicing = async (
  frets: Array<number | null>,
  volume = 0.55,
): Promise<void> => playPluckedNotes(
  voicingToMidiNotes(frets).map(({ midi, stringIndex }) => ({ midi, offset: (5 - stringIndex) * 0.032 })),
  volume,
);

/** Play one fretted note; `fret` is relative to the capo. */
export const previewSingleNote = async (
  stringIndex: number,
  fret: number,
  capo = 0,
  volume = 0.7,
): Promise<void> => {
  const frets = Array.from({ length: 6 }, (_, index) => (index === stringIndex ? fret : null));
  return playPluckedNotes(voicingToMidiNotes(frets, capo).map(({ midi }) => ({ midi, offset: 0 })), volume);
};
