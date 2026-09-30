import { expect, test } from '@playwright/test';
import { authenticatePage, getSong, register, seedSong } from './support';

test('play sections in a set order with repeats', async ({ page, request }) => {
  const token = await register(request);
  const songId = await seedSong(request, token, {
    title: 'E2E Form', bpm: 200, chordColumns: { 0: 'C', 8: 'G' }, sectionTitles: ['Verse', 'Chorus'],
    form: [{ section: 0, repeat: 1 }, { section: 1, repeat: 2 }],
  });
  await authenticatePage(page, token);
  await page.addInitScript(() => localStorage.setItem('guitarflow-count-in-bars', '0'));
  await page.goto(`/songs/${songId}/practice`);

  const order = page.getByTestId('song-form');
  await expect(order.getByRole('button')).toHaveText(['Verse', 'Chorus ×2']);

  // Jumping to the chorus while playing marks it as the current step.
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await order.getByRole('button', { name: 'Chorus ×2' }).click();
  await expect(order.getByRole('button', { name: 'Chorus ×2' })).toHaveAttribute('aria-current', 'step');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();

  const form = page.getByRole('region', { name: '演奏順序' });
  await form.getByRole('button', { name: '編輯順序' }).click();
  const editor = form.getByTestId('song-form-editor');
  await editor.getByRole('button', { name: 'Chorus 少彈一次' }).click();
  await editor.getByRole('button', { name: '加入 Verse' }).click();
  await editor.getByRole('button', { name: '第 3 個 Verse 往前' }).click();
  await form.getByRole('button', { name: '完成' }).click();
  await expect(order.getByRole('button')).toHaveText(['Verse', 'Verse', 'Chorus']);

  await page.getByRole('button', { name: '儲存', exact: true }).click();
  await expect.poll(async () => (await getSong(request, token, songId)).form).toEqual([
    { section: 0, repeat: 1 }, { section: 0, repeat: 1 }, { section: 1, repeat: 1 },
  ]);
});
