import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const apiBase = process.env.E2E_API_URL ?? 'http://127.0.0.1:18000/api';
const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

type ChordPlan = Record<string, { position: string; lockedShape?: { symbol: string; frets: (number | null)[] } }>;

const register = async (request: APIRequestContext) => {
  const response = await request.post(`${apiBase}/auth/register/`, {
    data: { username: `e2e_${randomUUID().replaceAll('-', '').slice(0, 16)}`, password: 'E2e-test-pass-2026' },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).token as string;
};

const authenticatePage = async (page: Page, token: string) => {
  await page.addInitScript(value => localStorage.setItem('guitarflow-auth-token', value), token);
};

const seedSong = async (
  request: APIRequestContext,
  token: string,
  options: { title: string; chordColumns?: Record<number, string>; playedFrets?: Array<number | null> }
) => {
  const rows = Array.from({ length: 6 }, () => Array(16).fill('-'));
  options.playedFrets?.forEach((fret, stringIndex) => {
    rows[stringIndex][0] = fret === null ? '-' : String(fret);
  });
  const chords: Array<string | null> = Array(16).fill(null);
  Object.entries(options.chordColumns ?? {}).forEach(([column, symbol]) => {
    chords[Number(column)] = symbol;
  });
  const response = await request.post(`${apiBase}/songs/`, {
    headers: { Authorization: `Token ${token}` },
    data: {
      title: options.title,
      transposeOffset: 0,
      voicingPlan: {},
      customChords: [],
      sections: [{ title: 'Verse', capo: 0, timeSignature: [4, 4], measures: [rows], chords: [chords], lyrics: [Array(16).fill(null)] }],
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).id as string;
};

const getSong = async (request: APIRequestContext, token: string, songId: string) => {
  const response = await request.get(`${apiBase}/songs/${songId}/`, {
    headers: { Authorization: `Token ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
};

test('register, create, save and reopen a song', async ({ page }) => {
  await page.goto('/songs');
  await page.getByRole('button', { name: '登入或註冊' }).click();
  await page.getByRole('button', { name: '還沒有帳號？註冊' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill(`e2e_${randomUUID().replaceAll('-', '').slice(0, 16)}`);
  await page.getByLabel('Password').fill('E2e-test-pass-2026');
  await page.getByRole('button', { name: '建立帳號' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: '新增歌曲' }).first().click();
  await expect(page).toHaveURL(/\/songs\/[^/]+\/create$/);
  await page.getByRole('textbox', { name: '歌曲名稱' }).fill('E2E Saved Song');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: '歌曲名稱' })).toHaveValue('E2E Saved Song');
});

test('confirm a chord candidate without changing entered frets', async ({ page, request }) => {
  const token = await register(request);
  const songId = await seedSong(request, token, { title: 'E2E Candidate Song', playedFrets: [0, 1, 0, 2, 3, null] });
  await authenticatePage(page, token);
  await page.goto(`/songs/${songId}/create`);

  await page.locator('[data-play-key] .font-mono button').first().click();
  await expect(page.getByRole('region', { name: '和弦辨識候選' })).toContainText('尚未寫入譜面');
  await page.getByRole('button', { name: /^採用 C：/ }).click();
  await expect(page.getByRole('button', { name: /^已採用 C：/ })).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();

  const saved = await getSong(request, token, songId);
  expect(saved.sections[0].chords[0][0]).toBe('C');
  expect(saved.sections[0].measures[0].map((row: string[]) => row[0])).toEqual(['0', '1', '0', '2', '3', '-']);
});

test('plan chord voicings, save them and start practice playback', async ({ page, request }) => {
  const token = await register(request);
  const songId = await seedSong(request, token, {
    title: 'E2E Practice Song', chordColumns: { 0: 'C', 4: 'Am', 8: 'F', 12: 'G' },
  });
  await authenticatePage(page, token);
  await page.goto(`/songs/${songId}/practice`);

  await page.getByRole('button', { name: '自動配置' }).click();
  const dialog = page.getByRole('dialog', { name: '整首歌指法配置' });
  await dialog.getByRole('radio', { name: /最容易/ }).click();
  await dialog.getByRole('button', { name: '套用整首歌' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();

  const saved = await getSong(request, token, songId);
  const plan = saved.voicingPlan as ChordPlan;
  expect(Object.keys(plan).sort()).toEqual(['Am', 'C', 'F', 'G']);
  for (const symbol of Object.keys(plan)) {
    expect(plan[symbol].lockedShape?.symbol).toBe(symbol);
    expect(plan[symbol].lockedShape?.frets).toHaveLength(6);
  }

  await page.getByRole('button', { name: '開始播放' }).click();
  await expect(page.getByRole('button', { name: '暫停播放' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop' }).click();
});

test('preview and persist an imported MusicXML score', async ({ page, request }) => {
  const token = await register(request);
  await authenticatePage(page, token);
  await page.goto('/songs');

  await page.locator('input[type="file"][accept*=".musicxml"]').setInputFiles(path.join(fixtureDir, 'simple-score.musicxml'));
  const dialog = page.getByRole('dialog', { name: 'Import Preview' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.alphatab-viewer svg, .alphatab-viewer canvas').first()).toBeVisible();
  await dialog.getByRole('button', { name: 'Import to Library' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/songs\/[^/]+\/practice$/);
  const songId = page.url().match(/\/songs\/([^/]+)\/practice$/)?.[1];
  expect(songId).toBeDefined();
  const imported = await getSong(request, token, songId!);
  expect(imported).toMatchObject({ source: 'imported', importFormat: 'musicxml' });
  expect(imported.title.replace(/\s/g, ' ')).toBe('E2E Simple Score');
});
