import { TabSection } from '../types';

/**
 * Encodes a numeric value into a Variable-Length Quantity (VLQ) byte array.
 * Used in MIDI to represent delta times.
 */
const toVLQ = (value: number): number[] => {
  const bytes: number[] = [];
  let buffer = value & 0x7F;
  value = value >> 7;
  while (value > 0) {
    bytes.push(0x80 | buffer);
    buffer = value & 0x7F;
    value = value >> 7;
  }
  bytes.push(buffer);
  return bytes.reverse();
};

/**
 * Translates guitar tab sections and notes into a standard format 0 MIDI file
 * and triggers a browser download.
 */
export const exportToMidi = (
  songTitle: string,
  sections: TabSection[],
  transposeOffset: number
) => {
  // Standard guitar tuning pitches (E2, A2, D3, G3, B3, E4)
  // Mapping matches layout strings 1-6 (high e to low E)
  const TUNING_PITCHES = [64, 59, 55, 50, 45, 40];

  interface Note {
    pitch: number;
    startTick: number;
    endTick: number;
  }

  const notes: Note[] = [];
  let currentTick = 0;

  // Track active note on each string to cut it off when a new note starts
  const lastNoteOnString: (Note | null)[] = [null, null, null, null, null, null];

  sections.forEach(section => {
    const capo = section.capo || 0;
    section.measures.forEach(measure => {
      // Each measure has 16 columns (16th notes)
      for (let colIdx = 0; colIdx < 16; colIdx++) {
        for (let sIdx = 0; sIdx < 6; sIdx++) {
          const fretStr = measure[sIdx][colIdx];
          
          if (fretStr !== '-' && fretStr !== '·') {
            const match = fretStr.match(/^(\d+)/);
            if (match) {
              const fret = parseInt(match[1], 10);
              // Calculate MIDI note value: tuning + fret + capo + transpose
              const pitch = TUNING_PITCHES[sIdx] + fret + capo + transposeOffset;

              // Cut off the previous note on this string if it exists
              if (lastNoteOnString[sIdx]) {
                lastNoteOnString[sIdx].endTick = currentTick;
              }

              const newNote: Note = {
                pitch,
                startTick: currentTick,
                endTick: currentTick + 128 // Default duration: 1 beat (quarter note)
              };
              notes.push(newNote);
              lastNoteOnString[sIdx] = newNote;
            } else if (fretStr.toLowerCase() === 'x') {
              // Muted string: cut off previous note on this string
              if (lastNoteOnString[sIdx]) {
                lastNoteOnString[sIdx].endTick = currentTick;
                lastNoteOnString[sIdx] = null;
              }
            }
          }
        }
        currentTick += 32; // Each column is a 16th note (32 ticks at 128 PPQ)
      }
    });
  });

  // Cut off any note that rings past the end of the song
  for (let sIdx = 0; sIdx < 6; sIdx++) {
    if (lastNoteOnString[sIdx]) {
      lastNoteOnString[sIdx].endTick = Math.min(lastNoteOnString[sIdx].endTick, currentTick);
    }
  }

  // Flatten notes into timeline events
  interface MidiEvent {
    tick: number;
    type: 'on' | 'off';
    pitch: number;
  }

  const events: MidiEvent[] = [];
  notes.forEach(note => {
    events.push({ tick: note.startTick, type: 'on', pitch: note.pitch });
    events.push({ tick: note.endTick, type: 'off', pitch: note.pitch });
  });

  // Sort events by tick. If ticks are equal, place Note Off before Note On.
  events.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type !== b.type) return a.type === 'off' ? -1 : 1;
    return 0;
  });

  // Assemble the track bytes
  const trackData: number[] = [];

  // 1. Meta Event: Set Tempo to 120 BPM (0x07A120 = 500,000 microseconds per quarter note)
  trackData.push(0x00, 0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20);

  // 2. Meta Event: Time Signature (4/4)
  trackData.push(0x00, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

  // 3. Program Change: Acoustic Steel Guitar (Instrument #26, MIDI index 25 = 0x19)
  trackData.push(0x00, 0xC0, 0x19);

  // Write Note On / Note Off events using delta times
  let lastTick = 0;
  events.forEach(evt => {
    const deltaTime = evt.tick - lastTick;
    lastTick = evt.tick;

    // Write delta time as VLQ
    trackData.push(...toVLQ(deltaTime));

    if (evt.type === 'on') {
      // Note On: Status 0x90 (Channel 0), pitch, velocity 96
      trackData.push(0x90, evt.pitch, 0x60);
    } else {
      // Note Off: Status 0x80 (Channel 0), pitch, velocity 64
      trackData.push(0x80, evt.pitch, 0x40);
    }
  });

  // End of Track Event: Delta-time 0, Status 0xFF, Type 0x2F, Length 0
  trackData.push(0x00, 0xFF, 0x2F, 0x00);

  // Build the complete standard MIDI file structure
  const midiBytes: number[] = [];

  // MThd Header Chunk
  midiBytes.push(0x4D, 0x54, 0x68, 0x64); // "MThd"
  midiBytes.push(0x00, 0x00, 0x00, 0x06); // Header length = 6
  midiBytes.push(0x00, 0x00);             // Format 0 (single track)
  midiBytes.push(0x00, 0x01);             // 1 track
  midiBytes.push(0x00, 0x80);             // Resolution = 128 ticks per quarter note

  // MTrk Track Chunk
  midiBytes.push(0x4D, 0x54, 0x72, 0x6B); // "MTrk"
  
  // Track data length (32-bit big-endian value)
  const len = trackData.length;
  midiBytes.push(
    (len >> 24) & 0xFF,
    (len >> 16) & 0xFF,
    (len >> 8) & 0xFF,
    len & 0xFF
  );
  midiBytes.push(...trackData);

  // Trigger browser file download
  const byteArray = new Uint8Array(midiBytes);
  const blob = new Blob([byteArray], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${songTitle.replace(/\s+/g, '_')}.mid`;
  link.click();
  URL.revokeObjectURL(url);
};
