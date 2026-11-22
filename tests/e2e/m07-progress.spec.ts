import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot } from './helpers';

async function tap(page: Page, s: number, f: number) {
  await page
    .getByRole('button', { name: new RegExp(`^String ${s} fret ${f}\\b`) })
    .dispatchEvent('pointerdown');
}

test('attempts are recorded, persisted, exported, imported and reset', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('F#m');
  for (const n of ['iv', 'V', 'ii°', '♭VI', '♭VII']) {
    await page
      .getByRole('group', { name: 'Chords' })
      .getByRole('button', { name: n, exact: true })
      .click();
  }
  await page.getByRole('group', { name: 'Strings' }).getByRole('button', { name: '2–4' }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  for (let i = 0; i < 3; i++) {
    await tap(page, 1, 5);
    await tap(page, 3, 6);
    await tap(page, 2, i === 2 ? 6 : 7);
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByRole('button', { name: 'End session' }).click();
  await page.goto('./#/stats');
  await expect(page.locator('.fn-grid')).toContainText('Minor keys');
  await expect(page.locator('.fn-grid')).toContainText('67%');
  await expect(page.locator('.line-chart')).toHaveCount(2);
  await expect(page.locator('.weak')).toContainText('F♯m · i · 1–3');
  await page.waitForTimeout(400);
  await page.reload();
  await expect(page.locator('.fn-grid')).toContainText('67%');
  await shot(page, 'm07-stats');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export JSON' }).click(),
  ]);
  const path = await download.path();
  const json = JSON.parse(readFileSync(path!, 'utf8'));
  expect(json.app).toBe('fretboard-chords');
  expect(Object.keys(json.stats)).toHaveLength(1);
  expect(json.log).toHaveLength(3);

  page.on('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Reset all progress' }).click();
  await expect(page.getByText('No practice recorded yet')).toBeVisible();

  await page.locator('input[type=file]').setInputFiles(path!);
  await expect(page.getByRole('status')).toContainText('Imported 1 items');
  await expect(page.locator('.fn-grid')).toContainText('67%');
  await expect(page.locator('.line-chart')).toHaveCount(2);
});
