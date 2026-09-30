import { expect, test } from '@playwright/test';
import { apiBase, authenticatePage, getSong, register, seedSong, waitForSignedIn } from './support';

test('tag, favourite and find songs by artist', async ({ page, request }) => {
  const token = await register(request);
  const sunny = await seedSong(request, token, { title: '晴天', artist: '周杰倫', chordColumns: { 0: 'G' } });
  await seedSong(request, token, { title: '小幸運', artist: '田馥甄', chordColumns: { 0: 'C' } });
  await authenticatePage(page, token);
  await page.goto('/songs');
  await waitForSignedIn(page);

  const library = page.locator('#song-library');
  await page.getByRole('textbox', { name: '搜尋歌曲' }).fill('周杰');
  await expect(library.getByRole('button', { name: /^晴天/ })).toBeVisible();
  await expect(library.getByRole('button', { name: /^小幸運 / })).toHaveCount(0);
  await page.getByRole('textbox', { name: '搜尋歌曲' }).fill('');

  await library.getByRole('button', { name: '編輯 晴天 的資訊' }).click();
  const dialog = page.getByRole('dialog', { name: '歌曲資訊' });
  await dialog.getByRole('combobox', { name: '原曲調' }).fill('G');
  await dialog.getByRole('textbox', { name: '新增標籤' }).fill('表演');
  await dialog.getByRole('textbox', { name: '新增標籤' }).press('Enter');
  await dialog.getByRole('button', { name: '儲存' }).click();
  await expect(dialog).toBeHidden();

  await library.getByRole('button', { name: '收藏 小幸運' }).click();
  await expect(library.getByRole('button', { name: '取消收藏 小幸運' })).toHaveAttribute('aria-pressed', 'true');

  await library.getByRole('button', { name: '# 表演', exact: true }).click();
  await expect(library.getByRole('button', { name: /^晴天 / })).toBeVisible();
  await expect(library.getByRole('button', { name: /^小幸運 / })).toHaveCount(0);
  await library.getByRole('button', { name: '# 表演', exact: true }).click();
  await library.getByRole('button', { name: '收藏', exact: true }).click();
  await expect(library.getByRole('button', { name: /^小幸運 / })).toBeVisible();
  await expect(library.getByRole('button', { name: /^晴天 / })).toHaveCount(0);

  const saved = await getSong(request, token, sunny);
  expect(saved.tags).toEqual(['表演']);
  expect(saved.originalKey).toBe('G');
});

test('play through a setlist in order', async ({ page, request }) => {
  const token = await register(request);
  const first = await seedSong(request, token, { title: 'Opener', chordColumns: { 0: 'C' } });
  const second = await seedSong(request, token, { title: 'Closer', chordColumns: { 0: 'G' } });
  await seedSong(request, token, { title: 'Spare', chordColumns: { 0: 'D' } });
  await authenticatePage(page, token);
  await page.goto('/songs');
  await waitForSignedIn(page);

  await page.getByRole('button', { name: '新增歌單' }).first().click();
  const dialog = page.getByRole('dialog', { name: '新增歌單' });
  await dialog.getByRole('textbox', { name: '歌單名稱' }).fill('週六表演');
  await dialog.getByRole('button', { name: '加入 Closer' }).click();
  await dialog.getByRole('button', { name: '加入 Opener' }).click();
  await dialog.getByRole('button', { name: '上移 Opener' }).click();
  await expect(dialog.getByTestId('setlist-item')).toHaveText([/Opener/, /Closer/]);
  await dialog.getByRole('button', { name: '儲存' }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: '開始 週六表演' }).click();
  await expect(page).toHaveURL(new RegExp(`/songs/${first}/practice\\?setlist=`));
  const bar = page.getByRole('navigation', { name: '歌單' });
  await expect(bar.getByTestId('setlist-position')).toHaveText('1/2');
  await bar.getByRole('button', { name: '下一首：Closer' }).click();
  await expect(page).toHaveURL(new RegExp(`/songs/${second}/practice\\?setlist=`));
  await expect(bar.getByTestId('setlist-position')).toHaveText('2/2');
  await expect(bar.getByRole('button', { name: '最後一首' })).toBeDisabled();

  const response = await request.get(`${apiBase}/setlists/`, { headers: { Authorization: `Token ${token}` } });
  const [setlist] = await response.json();
  expect(setlist.songIds).toEqual([first, second]);
});
