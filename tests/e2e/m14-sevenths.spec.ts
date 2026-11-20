import { expect, test } from '@playwright/test';
import { shot } from './helpers';

test('find a drop-2 V7 in C', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('C');
  await page.getByRole('radio', { name: 'Sevenths' }).click();
  for (const n of ['Imaj7', 'IVmaj7', 'ii7', 'vi7']) {
    await page
      .getByRole('group', { name: 'Chords' })
      .getByRole('button', { name: n, exact: true })
      .click();
  }
  await page.getByRole('group', { name: 'Strings' }).getByRole('button', { name: '1–4' }).click(); // only 2–5
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('.prompt-main')).toHaveText('C · V7');
  await expect(page.locator('.prompt-sub')).toHaveText('strings 2–5 · frets 5–9');
  await page.getByRole('button', { name: 'Show answer' }).click();
  await expect(page.getByRole('status')).toContainText('G7 (G–B–D–F)');
  const reveal = page.locator('[data-kind=reveal]');
  expect(await reveal.count()).toBeGreaterThanOrEqual(4);
  await shot(page, 'm14-find-v7');
});

test('explorer shows seventh voicings with 7th roles', async ({ page }) => {
  await page.goto('./#/explore');
  await page.getByRole('radio', { name: 'Sevenths' }).click();
  await expect(page.locator('.prompt-main')).toContainText('F♯m7');
  await expect(page.locator('.fretboard')).toContainText('♭7');
  await shot(page, 'm14-explore');
});
