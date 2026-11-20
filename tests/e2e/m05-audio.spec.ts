import { expect, test } from '@playwright/test';

test('tapping notes and playing a chord creates audio without errors; mute toggles', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const AC = window.AudioContext;
    (window as unknown as { __started: number }).__started = 0;
    const orig = AC.prototype.createBufferSource;
    AC.prototype.createBufferSource = function (this: AudioContext) {
      (window as unknown as { __started: number }).__started++;
      return orig.call(this);
    };
  });
  await page.goto('./#/explore');
  await page.getByRole('button', { name: /String 2 fret 7/ }).dispatchEvent('pointerdown');
  await page.getByRole('button', { name: '▶ Play' }).click();
  const started = await page.evaluate(() => (window as unknown as { __started: number }).__started);
  expect(started).toBe(4); // 1 tap + 3-note strum
  await page.getByRole('button', { name: 'Mute' }).click();
  await expect(page.getByRole('button', { name: 'Unmute' })).toBeVisible();
  await page.getByRole('button', { name: '▶ Play' }).click();
  expect(await page.evaluate(() => (window as unknown as { __started: number }).__started)).toBe(4);
  expect(errors).toEqual([]);
});
