import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { apiBase, authenticatePage, getSong, register, seedSong } from './support';

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

type ChordPlan = Record<string, { position: string; lockedShape?: { symbol: string; frets: (number | null)[] } }>;

test('register, create, save and reopen a song', async ({ page }) => {
  await page.goto('/songs');
  await page.getByRole('button', { name: '登入或註冊' }).click();
  await page.getByRole('button', { name: '還沒有帳號？註冊' }).click();
  await page.getByRole('textbox', { name: '帳號' }).fill(`e2e_${randomUUID().replaceAll('-', '').slice(0, 16)}`);
  await page.getByLabel('密碼').fill('E2e-test-pass-2026');
  await page.getByRole('button', { name: '建立帳號' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: '新增歌曲' }).first().click();
  await expect(page).toHaveURL(/\/songs\/[^/]+\/create$/);
  await page.getByRole('textbox', { name: '歌曲名稱' }).fill('E2E Saved Song');
  await page.getByRole('button', { name: '儲存', exact: true }).click();
  await expect(page.getByRole('button', { name: '已儲存' })).toBeVisible();
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
  await page.getByRole('button', { name: '儲存', exact: true }).click();
  await expect(page.getByRole('button', { name: '已儲存' })).toBeVisible();

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
  await page.getByRole('button', { name: '儲存', exact: true }).click();
  await expect(page.getByRole('button', { name: '已儲存' })).toBeVisible();

  const saved = await getSong(request, token, songId);
  const plan = saved.voicingPlan as ChordPlan;
  expect(Object.keys(plan).sort()).toEqual(['Am', 'C', 'F', 'G']);
  for (const symbol of Object.keys(plan)) {
    expect(plan[symbol].lockedShape?.symbol).toBe(symbol);
    expect(plan[symbol].lockedShape?.frets).toHaveLength(6);
  }

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Stop' }).click();
});

test('write chords and lyrics without touching the tab', async ({ page, request }) => {
  const token = await register(request);
  const songId = await seedSong(request, token, {
    title: 'E2E Lead Sheet', chordColumns: { 0: 'C' }, lyricColumns: { 0: '喔愛 什麼是愛' },
  });
  await authenticatePage(page, token);
  await page.goto(`/songs/${songId}/create`);

  await expect(page.getByRole('tab', { name: '歌詞和弦' })).toHaveAttribute('aria-selected', 'true');
  const editor = page.getByTestId('lyrics-editor');
  await expect(editor.getByRole('textbox', { name: '第 1 小節歌詞' }).first()).toHaveValue('喔愛 什麼是愛');

  const beat3 = editor.getByRole('textbox', { name: '第 1 小節第 3 拍和弦' });
  await beat3.fill('G');
  await beat3.press('Enter');
  await expect(editor.getByRole('textbox', { name: '第 1 小節歌詞' })).toHaveCount(2);
  const secondLyric = editor.getByRole('textbox', { name: '第 1 小節歌詞' }).nth(1);
  await secondLyric.fill('你看我的眼神');
  await secondLyric.press('Enter');

  const beat2 = editor.getByRole('textbox', { name: '第 1 小節第 2 拍和弦' });
  await beat2.fill('Hmaj9');
  await beat2.press('Tab');
  await expect(beat2).toHaveAttribute('aria-invalid', 'true');
  await beat2.fill('');
  await beat2.press('Tab');

  await editor.getByRole('button', { name: '新增小節' }).click();
  await expect(editor.getByTestId('lyrics-measure')).toHaveCount(2);

  await page.getByRole('button', { name: '儲存', exact: true }).click();
  await expect(page.getByRole('button', { name: '已儲存' })).toBeVisible();
  const saved = await getSong(request, token, songId);
  const section = saved.sections[0];
  expect(section.chords[0][0]).toBe('C');
  expect(section.chords[0][8]).toBe('G');
  expect(section.chords[0][4]).toBeNull();
  expect(section.lyrics[0][8]).toBe('你看我的眼神');
  expect(section.measures).toHaveLength(2);
  expect(section.measures.flat(2).every((cell: string) => cell === '-')).toBe(true);

  await page.getByRole('tab', { name: '六線譜' }).click();
  await page.reload();
  await expect(page.getByRole('tab', { name: '六線譜' })).toHaveAttribute('aria-selected', 'true');
});

test('open a song at its saved tempo and save a new one', async ({ page, request }) => {
  const token = await register(request);
  const songId = await seedSong(request, token, { title: 'E2E Tempo Song', bpm: 100, chordColumns: { 0: 'C', 8: 'G' } });
  await authenticatePage(page, token);
  await page.goto(`/songs/${songId}/practice`);

  await expect(page.getByRole('button', { name: 'Increase tempo' }).locator('xpath=..')).toContainText('100');
  await page.getByRole('button', { name: 'Increase tempo' }).click();
  await expect(page.getByRole('button', { name: 'Increase tempo' }).locator('xpath=..')).toContainText('105');
  await page.getByRole('button', { name: '儲存', exact: true }).click();
  await expect(page.getByRole('button', { name: '已儲存' })).toBeVisible();

  expect((await getSong(request, token, songId)).bpm).toBe(105);
});

test('drop the capo to read chords in the sounding key', async ({ page, request }) => {
  const token = await register(request);
  const songId = await seedSong(request, token, {
    title: 'E2E Capo Song', capo: 4, chordColumns: { 0: 'C', 4: 'Am', 8: 'F', 12: 'G' },
  });
  await authenticatePage(page, token);
  await page.goto(`/songs/${songId}/practice`);

  const capoView = page.getByRole('group', { name: 'Capo 顯示' });
  await expect(capoView.getByRole('button', { name: 'Capo 4・C 指型' })).toHaveAttribute('aria-pressed', 'true');
  await capoView.getByRole('button', { name: '不夾 Capo・E 調' }).click();
  for (const name of ['E', 'C#m', 'A', 'B']) {
    await expect(page.getByRole('button', { name, exact: true }).first()).toBeVisible();
  }
  await expect(page.getByText('不夾 Capo（原 Capo 4）')).toBeVisible();
  await expect(page.getByRole('button', { name: '自動配置' })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('group', { name: 'Capo 顯示' }).getByRole('button', { name: '不夾 Capo・E 調' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('group', { name: 'Capo 顯示' }).getByRole('button', { name: 'Capo 4・C 指型' }).click();
  await expect(page.getByRole('button', { name: 'Am', exact: true }).first()).toBeVisible();
});

test('suggest solo notes over the chord progression', async ({ page, request }) => {
  const token = await register(request);
  const songId = await seedSong(request, token, {
    title: 'E2E Arrange Song', chordColumns: { 0: 'C', 4: 'G', 8: 'Am', 12: 'F' },
  });
  await authenticatePage(page, token);
  await page.goto(`/songs/${songId}/practice`);

  await page.getByRole('button', { name: '編曲' }).first().click();
  await expect(page).toHaveURL(new RegExp(`/songs/${songId}/arrange$`));
  await expect(page.getByRole('combobox', { name: '調性' })).toHaveValue('0:major');
  await expect(page.getByRole('tab', { name: '產生 Solo' })).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('tab', { name: '查音' }).click();
  await page.getByTestId('arrange-progression').getByRole('button', { name: /^G/ }).click();
  await expect(page.getByTestId('arrange-suggestions')).toContainText('3 度');
  await expect(page.getByTestId('solo-fretboard').getByRole('button', { name: '1 弦（e）第 7 格 B' })).toBeVisible();

  await page.getByRole('button', { name: '整首歌的音階' }).click();
  await expect(page.getByTestId('arrange-scale-card')).toContainText('C 大調五聲');
  await expect(page.getByTestId('arrange-scale-card')).toContainText('A 小調五聲');
});

test('generate a solo and add it to the song', async ({ page, request }) => {
  const token = await register(request);
  const songId = await seedSong(request, token, {
    title: 'E2E Solo Song', chordColumns: { 0: 'C', 4: 'G', 8: 'Am', 12: 'F' },
  });
  await authenticatePage(page, token);
  await page.goto(`/songs/${songId}/arrange`);

  const generator = page.getByTestId('solo-generator');
  await generator.getByRole('radio', { name: /引導音線/ }).click();
  await generator.getByRole('button', { name: '產生 Solo' }).click();
  await expect(page.getByTestId('solo-preview')).toBeVisible();
  await generator.getByRole('button', { name: '加入歌曲' }).click();
  await expect(page.getByTestId('solo-inserted')).toContainText('Solo（Verse）');
  await page.getByRole('button', { name: '儲存', exact: true }).click();
  await expect(page.getByRole('button', { name: '已儲存' })).toBeVisible();

  const saved = await getSong(request, token, songId);
  expect(saved.sections.map((section: { title: string }) => section.title)).toEqual(['Verse', 'Solo（Verse）']);
  const solo = saved.sections[1];
  expect(solo.chords).toEqual(saved.sections[0].chords);
  expect(solo.measures.flat(2).filter((cell: string) => cell !== '-').length).toBeGreaterThan(0);
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

  await page.reload();
  await expect(page.locator('.alphatab-viewer svg, .alphatab-viewer canvas').first()).toBeVisible();
});

test('import, reopen and play a Guitar Pro score', async ({ page, request }) => {
  const token = await register(request);
  await authenticatePage(page, token);
  await page.goto('/songs');

  const fixture = path.join(fixtureDir, 'simple-score.gp');
  await page.locator('input[type="file"][accept*=".gp"]').setInputFiles(fixture);
  const dialog = page.getByRole('dialog', { name: 'Import Preview' });
  await expect(dialog.locator('.alphatab-viewer svg, .alphatab-viewer canvas').first()).toBeVisible();
  await dialog.getByRole('button', { name: 'Import to Library' }).click();
  await expect(page).toHaveURL(/\/songs\/[^/]+\/practice$/);

  const songId = page.url().match(/\/songs\/([^/]+)\/practice$/)?.[1];
  expect(songId).toBeDefined();
  const imported = await getSong(request, token, songId!);
  expect(imported).toMatchObject({ source: 'imported', importFormat: 'gp' });
  expect(imported.title.replace(/\s/g, ' ')).toBe('E2E Simple Score');

  const fileResponse = await request.get(`${apiBase}/songs/${songId}/score-file/`, {
    headers: { Authorization: `Token ${token}` },
  });
  expect(fileResponse.ok()).toBeTruthy();
  expect(await fileResponse.body()).toEqual(readFileSync(fixture));

  await page.reload();
  await expect(page.locator('.alphatab-viewer svg, .alphatab-viewer canvas').first()).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
});
