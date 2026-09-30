import { expect, test } from '@playwright/test';
import { authenticatePage, getSong, register, waitForSignedIn } from './support';

const SHEET = `小幸運
歌手：田馥甄  作詞：徐世珍
原調：E
拍速：76
Capo: 3
刷法：↓ ↓↑ -↑ ↓↑

[主歌]
|C          |G          |
 我聽見雨滴  落在青青草地
|Am         |F    G     |
 我聽見遠方  下課鐘聲響起

副歌 指法：T1 21 31 21
|F          |G          |C     Cmaj13 |
 原來你是    我最想留住的幸運

回主歌`;

test('paste a chord sheet to create a song', async ({ page, request }) => {
  const token = await register(request);
  await authenticatePage(page, token);
  await page.goto('/songs');
  await waitForSignedIn(page);

  await page.getByRole('button', { name: '貼上和弦譜' }).first().click();
  const dialog = page.getByRole('dialog', { name: '貼上和弦譜' });
  await expect(dialog.getByRole('button', { name: '建立歌曲' })).toBeDisabled();
  await dialog.getByRole('textbox', { name: '和弦譜文字' }).fill(SHEET);

  const preview = dialog.getByTestId('sheet-preview');
  await expect(dialog.getByRole('textbox', { name: '歌名' })).toHaveValue('小幸運');
  await expect(preview).toContainText('2 段 · 7 小節');
  await expect(preview).toContainText('76 BPM');
  await expect(preview).toContainText('Capo 3');
  await expect(preview).toContainText('原曲 E 調');
  await expect(dialog.getByRole('textbox', { name: '歌手' })).toHaveValue('田馥甄');
  await expect(preview.getByLabel('副歌 伴奏')).toHaveText('T1 21 31 21');
  await expect(preview).toContainText('Cmaj13');
  await expect(preview.getByRole('heading', { name: '副歌' })).toBeVisible();
  await expect(preview.getByTestId('sheet-form')).toHaveText('演奏順序：主歌 → 副歌 → 主歌');

  await dialog.getByRole('textbox', { name: '歌名' }).fill('小幸運 練習');
  await dialog.getByRole('button', { name: '建立歌曲' }).click();
  await expect(page).toHaveURL(/\/songs\/[^/]+\/create$/);
  await expect(page.getByTestId('lyrics-editor')).toBeVisible();

  const songId = page.url().match(/\/songs\/([^/]+)\/create/)![1];
  const song = await getSong(request, token, songId);
  expect(song.title).toBe('小幸運 練習');
  expect(song.bpm).toBe(76);
  expect(song.artist).toBe('田馥甄');
  expect(song.originalKey).toBe('E');
  expect(song.sections.map((section: { pattern: string }) => section.pattern)).toEqual(['↓ ↓↑ -↑ ↓↑', 'T1 21 31 21']);
  expect(song.sections.map((section: { title: string }) => section.title)).toEqual(['主歌', '副歌']);
  expect(song.sections[0].capo).toBe(3);
  expect(song.form).toEqual([{ section: 0, repeat: 1 }, { section: 1, repeat: 1 }, { section: 0, repeat: 1 }]);
  expect(song.sections[0].chords[0][0]).toBe('C');
  expect(song.sections[0].lyrics[0][0]).toBe('我聽見雨滴');
  expect(song.sections[0].chords[3].filter(Boolean)).toEqual(['F', 'G']);
});
