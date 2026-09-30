import { expect, test } from '@playwright/test';
import { apiBase, authenticatePage, getSong, register, seedSong } from './support';

test('suggest a key for my range and a capo without barre chords', async ({ page, request }) => {
  const token = await register(request);
  const songId = await seedSong(request, token, { title: 'E2E Barre Song', chordColumns: { 0: 'Bb', 4: 'F', 8: 'Gm', 12: 'Eb' } });
  await request.patch(`${apiBase}/songs/${songId}/info/`, {
    headers: { Authorization: `Token ${token}` },
    data: { originalKey: 'Bb', melodyRange: { low: 50, high: 66 } },
  });
  await authenticatePage(page, token);
  await page.addInitScript(() => localStorage.setItem('guitarflow-vocal-range', JSON.stringify({ low: 48, high: 68 })));
  await page.goto(`/songs/${songId}/practice`);

  await page.getByRole('button', { name: '找適合的調' }).first().click();
  const dialog = page.getByRole('dialog', { name: '找適合的調' });
  await expect(dialog.getByRole('combobox', { name: '我的音域最低音' })).toHaveValue('48');
  await expect(dialog.getByRole('combobox', { name: '這首歌的音域最高音' })).toHaveValue('66');

  const best = dialog.getByTestId('key-suggestion').first();
  await expect(best).toContainText('唱 Bb 調');
  await expect(best).toContainText('原調');
  await expect(best).toContainText('Capo 3');
  await expect(best).toContainText('G D Em C');
  await best.getByRole('button', { name: '套用 Bb 調 Capo 3' }).click();
  await expect(dialog).toBeHidden();

  // A female-range singer gets a higher key.
  await page.getByRole('button', { name: '找適合的調' }).first().click();
  await dialog.getByRole('button', { name: '女生', exact: true }).click();
  await expect(dialog.getByTestId('key-suggestion').first()).toContainText('比原調高');

  await dialog.getByRole('button', { name: '關閉' }).click();
  await page.getByRole('button', { name: '儲存', exact: true }).click();
  await expect.poll(async () => {
    const song = await getSong(request, token, songId);
    return [song.transposeOffset, song.sections[0].capo];
  }).toEqual([-3, 3]);
});

test('remember the key it assumed when the song has no original key', async ({ page, request }) => {
  const token = await register(request);
  const songId = await seedSong(request, token, { title: 'E2E No Key', chordColumns: { 0: 'Bb', 4: 'F', 8: 'Gm', 12: 'Eb' } });
  await authenticatePage(page, token);
  await page.addInitScript(() => localStorage.setItem('guitarflow-vocal-range', JSON.stringify({ low: 48, high: 68 })));
  await page.goto(`/songs/${songId}/practice`);

  await page.getByRole('button', { name: '找適合的調' }).first().click();
  const dialog = page.getByRole('dialog', { name: '找適合的調' });
  await expect(dialog).toContainText('沒有設定原曲調，先當作 Bb 調');
  await dialog.getByRole('button', { name: '原唱男生' }).click();
  await dialog.getByRole('button', { name: /^套用 .* Capo 3$/ }).first().click();
  await expect.poll(async () => (await getSong(request, token, songId)).originalKey).toBe('Bb');

  await page.getByRole('button', { name: '找適合的調' }).first().click();
  await expect(dialog).toContainText('目前唱 Bb 調・原曲 Bb 調');
  await expect(dialog.getByTestId('key-suggestion').first()).toContainText('目前');
});
