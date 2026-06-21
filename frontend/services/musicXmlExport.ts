import { GuitarSong } from '../types';

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const TUNING_MIDI = [64, 59, 55, 50, 45, 40]; // e B G D A E

const fretToMidi = (stringIdx: number, fret: number): number => TUNING_MIDI[stringIdx] + fret;

/** PoC: export gflow song as minimal MusicXML 3.1 (single guitar part, tab technical). */
export const exportGflowToMusicXml = (song: Pick<GuitarSong, 'title' | 'sections' | 'transposeOffset'>): string => {
  const title = escapeXml(song.title || 'Untitled');
  const measuresXml: string[] = [];
  let measureNumber = 1;

  for (const section of song.sections) {
    for (let mIdx = 0; mIdx < section.measures.length; mIdx++) {
      const measure = section.measures[mIdx];
      const notes: string[] = [];

      if (measureNumber === 1) {
        notes.push(`
          <attributes>
            <divisions>1</divisions>
            <key><fifths>0</fifths></key>
            <time><beats>4</beats><beat-type>4</beat-type></time>
            <clef><sign>TAB</sign><line>5</line></clef>
          </attributes>`);
      }

      for (let col = 0; col < 16; col++) {
        for (let sIdx = 0; sIdx < 6; sIdx++) {
          const cell = measure[sIdx]?.[col] ?? '-';
          if (cell === '-' || cell === '·') continue;
          if (cell.toLowerCase() === 'x') {
            notes.push(`
            <note>
              <pitch><step>C</step><octave>4</octave></pitch>
              <duration>1</duration>
              <type>quarter</type>
              <notations><technical><string>${sIdx + 1}</string><fret>0</fret><dead-note/></technical></notations>
            </note>`);
            continue;
          }
          const fretMatch = cell.match(/^(\d+)/);
          if (!fretMatch) continue;
          const fret = parseInt(fretMatch[1], 10);
          const midi = fretToMidi(sIdx, fret) + song.transposeOffset;
          const step = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][midi % 12];
          const octave = Math.floor(midi / 12) - 1;
          notes.push(`
            <note>
              <pitch><step>${step.replace('#', '')}</step>${step.includes('#') ? '<alter>1</alter>' : ''}<octave>${octave}</octave></pitch>
              <duration>1</duration>
              <type>quarter</type>
              <notations><technical><string>${sIdx + 1}</string><fret>${fret}</fret></technical></notations>
            </note>`);
        }
      }

      measuresXml.push(`<measure number="${measureNumber}">${notes.join('')}</measure>`);
      measureNumber += 1;
    }
  }

  if (measuresXml.length === 0) {
    measuresXml.push(`<measure number="1"><attributes><divisions>1</divisions></attributes><note><rest/></note></measure>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${title}</work-title></work>
  <part-list>
    <score-part id="P1"><part-name>Guitar</part-name></score-part>
  </part-list>
  <part id="P1">${measuresXml.join('')}</part>
</score-partwise>`;
};

export const downloadMusicXml = (song: Pick<GuitarSong, 'title' | 'sections' | 'transposeOffset'>) => {
  const xml = exportGflowToMusicXml(song);
  const blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(song.title || 'song').replace(/\s+/g, '_')}.musicxml`;
  link.click();
  URL.revokeObjectURL(url);
};
