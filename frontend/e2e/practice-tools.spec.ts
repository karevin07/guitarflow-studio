import { expect, test } from '@playwright/test';
import { authenticatePage, getSong, register, seedSong } from './support';

const openPractice = async (page: import('@playwright/test').Page, songId: string) => {
  await page.goto(`/songs/${songId}/practice`);
  await expect(page.getByTestId('songbook-section').first()).toBeVisible();
};

const tempo = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Increase tempo' }).locator('xpath=..');

test('count in before playback starts', async ({ page, request }) => {
  const token = await register(request);
  const songId = await seedSong(request, token, { title: 'E2E Count-in', bpm: 90, chordColumns: { 0: 'C', 8: 'G' } });
  await authenticatePage(page, token);
  await openPractice(page, songId);

  await page.getByRole('button', { name: 'Playback controls' }).click();
  await expect(page.getByRole('radio', { name: '1 小節' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByText(/^預備 \d$/)).toBeVisible();
  await expect(page.getByText('播放中')).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
});

test('loop one section and speed it up each pass', async ({ page, request }) => {
  const token = await register(request);
  const songId = await seedSong(request, token, {
    title: 'E2E Section Loop', bpm: 200, chordColumns: { 0: 'C', 8: 'G' }, sectionTitles: ['Verse', 'Chorus'],
  });
  await authenticatePage(page, token);
  await openPractice(page, songId);

  await page.getByRole('button', { name: 'Playback controls' }).click();
  await page.getByRole('radio', { name: '不用' }).click();
  await page.getByRole('checkbox', { name: '漸進加速' }).check();
  await page.getByRole('combobox', { name: '每次加快' }).selectOption('10');
  await page.getByRole('spinbutton', { name: '目標速度' }).fill('220');
  // The open controls panel sits over the score; close it like a player would.
  await page.getByRole('button', { name: 'Playback controls' }).click();

  const chorusLoop = page.getByRole('button', { name: '循環這段' }).nth(1);
  await chorusLoop.click();
  const chorus = page.getByTestId('songbook-section').nth(1);
  await expect(page.getByRole('button', { name: '循環中' })).toHaveAttribute('aria-pressed', 'true');
  await expect(chorus.locator('[data-playback-active]')).toHaveCount(1);

  // One bar at 200 BPM takes 1.2 s; after a pass or two the tempo climbs to the 220 target and stops there.
  await expect(tempo(page)).toContainText('210', { timeout: 6000 });
  await expect(tempo(page)).toContainText('220', { timeout: 6000 });
  await expect(page.getByTestId('songbook-section').first().locator('[data-playback-active]')).toHaveCount(0);

  await page.getByRole('button', { name: '循環中' }).click();
  await expect(page.getByRole('button', { name: '循環這段' })).toHaveCount(2);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
});

test('drill switching between two chords', async ({ page, request }) => {
  const token = await register(request);
  const songId = await seedSong(request, token, { title: 'E2E Chord Switch', chordColumns: { 0: 'C', 4: 'G', 8: 'Am', 12: 'F' } });
  await authenticatePage(page, token);
  await openPractice(page, songId);

  await page.getByRole('button', { name: '換和弦練習' }).click();
  const dialog = page.getByRole('dialog', { name: '換和弦練習' });
  await dialog.getByRole('combobox', { name: '和弦 2' }).selectOption('F');
  await dialog.getByRole('spinbutton', { name: '練習速度' }).fill('200');
  await dialog.getByRole('combobox', { name: '每幾拍換一次' }).selectOption('1');
  await dialog.getByRole('button', { name: '開始' }).click();

  await expect(dialog.getByTestId('chord-switch-count')).not.toHaveText('0', { timeout: 5000 });
  await expect(dialog.getByTestId('chord-switch-current')).toHaveText(/^(C|F)$/);
  await dialog.getByRole('button', { name: '暫停' }).click();
  await dialog.getByRole('button', { name: '關閉' }).click();
  await expect(dialog).toHaveCount(0);
});

test('choose strumming and fingerpicking accompaniment per section', async ({ page, request }) => {
  const token = await register(request);
  const songId = await seedSong(request, token, {
    title: 'E2E Accompaniment', chordColumns: { 0: 'C', 8: 'G' }, sectionTitles: ['Verse', 'Chorus'],
  });
  await authenticatePage(page, token);
  await openPractice(page, songId);

  await page.getByRole('button', { name: 'Verse 伴奏：無' }).click();
  await page.getByRole('dialog', { name: 'Verse 伴奏' }).getByRole('button', { name: /分散和弦/ }).click();
  await expect(page.getByRole('button', { name: 'Verse 伴奏：T1 21 31 21' })).toContainText('分散和弦');

  await page.getByRole('button', { name: 'Chorus 伴奏：無' }).click();
  const chorus = page.getByRole('dialog', { name: 'Chorus 伴奏' });
  await chorus.getByRole('textbox', { name: '自訂伴奏' }).fill('↓ Q');
  await expect(chorus).toContainText('看不懂「Q」');
  await expect(chorus.getByRole('button', { name: '套用到這段' })).toBeDisabled();
  await chorus.getByRole('textbox', { name: '自訂伴奏' }).fill('↓ ↓↑ X↑ ↓↑');
  await chorus.getByRole('button', { name: '套用到這段' }).click();
  await expect(page.getByRole('button', { name: 'Chorus 伴奏：↓ ↓↑ X↑ ↓↑' })).toBeVisible();

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();

  await page.getByRole('button', { name: '儲存', exact: true }).click();
  await expect(page.getByRole('button', { name: '已儲存' })).toBeVisible();
  let saved = await getSong(request, token, songId);
  expect(saved.sections.map((section: { pattern: string }) => section.pattern)).toEqual(['T1 21 31 21', '↓ ↓↑ X↑ ↓↑']);

  await page.getByRole('button', { name: /^Verse 伴奏/ }).click();
  const verse = page.getByRole('dialog', { name: 'Verse 伴奏' });
  await verse.getByRole('textbox', { name: '自訂伴奏' }).fill('↓ ↓ ↓ ↓');
  await verse.getByRole('button', { name: '套用到全曲' }).click();
  await page.getByRole('button', { name: '儲存', exact: true }).click();
  await expect(page.getByRole('button', { name: '已儲存' })).toBeVisible();
  saved = await getSong(request, token, songId);
  expect(saved.sections.map((section: { pattern: string }) => section.pattern)).toEqual(['↓ ↓ ↓ ↓', '↓ ↓ ↓ ↓']);
});
