import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as alphaTab from '@coderline/alphatab';

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(fixtureDir, 'simple-score.musicxml'));
const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(source);
const guitarPro = new alphaTab.exporter.Gp7Exporter().export(score);
const reopened = alphaTab.importer.ScoreLoader.loadScoreFromBytes(guitarPro);

if (reopened.title !== score.title || reopened.tracks.length !== score.tracks.length) {
  throw new Error('Generated Guitar Pro fixture failed its round-trip check');
}

writeFileSync(path.join(fixtureDir, 'simple-score.gp'), guitarPro);
