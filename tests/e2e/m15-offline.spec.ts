import { expect, test } from '@playwright/test';

test('app installs a service worker and works fully offline', async ({ page, context }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.hostname !== 'localhost') external.push(r.url());
  });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Fretboard Chords' })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), {
      timeout: 10_000,
    })
    .toBe(true);

  const manifest = await page.evaluate(async () => {
    const href = document.querySelector('link[rel=manifest]')!.getAttribute('href')!;
    return (await fetch(href)).json();
  });
  expect(manifest.name).toBe('Fretboard Chords');
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Fretboard Chords' })).toBeVisible();
  await page.getByRole('button', { name: /Chord explorer/ }).click();
  await expect(page.getByTestId('note-2-7')).toContainText('R');
  await page.goto('./#/practice');
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('.prompt-main')).toBeVisible();
  expect(external).toEqual([]);
});
