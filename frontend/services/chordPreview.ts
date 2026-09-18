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

export const previewChordVoicing = async (
  frets: Array<number | null>,
  volume = 0.55,
): Promise<void> => {
  const AudioContextClass = window.AudioContext
    || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio API is unavailable');

  audioContext ??= new AudioContextClass();
  if (audioContext.state === 'suspended') await audioContext.resume();

  const now = audioContext.currentTime;
  const notes = voicingToMidiNotes(frets);
  notes.forEach(({ midi, stringIndex }) => {
    if (!audioContext) return;
    const start = now + (5 - stringIndex) * 0.032;
    const oscillator = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(440 * Math.pow(2, (midi - 69) / 12), start);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600, start);
    filter.frequency.exponentialRampToValueAtTime(900, start + 0.8);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.01, Math.min(1, volume)) * 0.12, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.25);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + 1.3);
  });
};
