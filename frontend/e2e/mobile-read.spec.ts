import { expect, test } from '@playwright/test';
import { authenticatePage, register, seedSong } from './support';

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});

test('read and play a chord sheet on a phone viewport', async ({ page, request }) => {
  const token = await register(request);
  const songId = await seedSong(request, token, {
    title: 'E2E Mobile Chord Sheet',
    chordColumns: { 0: 'C', 8: 'G' },
    lyricColumns: { 0: 'A simple melody', 8: 'for a small screen' },
    sectionTitles: ['Verse', 'Chorus'],
  });
  await authenticatePage(page, token);
  await page.goto(`/songs/${songId}/practice`);

  await expect(page.getByRole('textbox', { name: '歌曲名稱' })).toHaveValue('E2E Mobile Chord Sheet');
  await expect(page.getByRole('heading', { name: 'Verse' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Verse' })).toBeInViewport();
  await expect(page.getByText('A simple melody').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '練習', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '本曲和弦' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: '開始自動捲動' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: '更多歌曲操作' }).click();
  await expect(page.getByRole('button', { name: '儲存歌曲' })).toBeVisible();
  await page.getByRole('button', { name: '更多歌曲操作' }).click();
  await page.getByRole('button', { name: '本曲和弦' }).click();
  await expect(page.getByRole('button', { name: '本曲和弦' })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: '本曲和弦' }).click();

  await page.getByRole('button', { name: '選擇段落' }).click();
  await page.getByRole('button', { name: 'Chorus', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chorus' })).toBeInViewport();
  await page.getByRole('button', { name: '選擇段落' }).click();
  await page.getByRole('button', { name: 'Verse', exact: true }).click();

  await page.getByRole('button', { name: 'C', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'C 和弦按法' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'C 和弦按法' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Transpose up' }).click();
  await expect(page.getByRole('button', { name: 'C#', exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: '開始自動捲動' }).click();
  await expect(page.getByRole('button', { name: 'Slower auto scroll' })).toBeVisible();
  await page.getByRole('button', { name: '暫停自動捲動' }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
});
