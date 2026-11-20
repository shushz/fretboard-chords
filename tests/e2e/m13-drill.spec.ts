import { expect, test, type Page } from '@playwright/test';
import { shot } from './helpers';

async function tap(page: Page, s: number, f: number) {
  await page
    .getByRole('button', { name: new RegExp(`^String ${s} fret ${f}\\b`) })
    .dispatchEvent('pointerdown');
}

test('weak items can be drilled from the stats screen; due items offered on home', async ({
  page,
}) => {
  await page.goto('./#/practice');
  await page.getByLabel('Key', { exact: true }).selectOption('F#m');
  for (const n of ['iv', 'V', 'ii°', '♭VI', '♭VII']) {
    await page
      .getByRole('group', { name: 'Chords' })
      .getByRole('button', { name: n, exact: true })
      .click();
  }
  await page.getByRole('group', { name: 'Strings' }).getByRole('button', { name: '2–4' }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Show answer' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByRole('button', { name: 'End' }).click();
  await page.waitForTimeout(400);

  await page.goto('./');
  await expect(page.getByRole('button', { name: /Review due items \(1\)/ })).toBeVisible();
  await shot(page, 'm13-home-review');

  await page.goto('./#/stats');
  await page.getByRole('button', { name: 'Drill these' }).click();
  await expect(page.locator('.drill-tag')).toHaveText('Weak spots');
  await expect(page.locator('.drill-item')).toHaveText('F♯m · i · 1–3');
  await expect(page.locator('.prompt-main')).toHaveText('F♯m · i');
  await tap(page, 1, 5);
  await tap(page, 3, 6);
  await tap(page, 2, 7);
  await expect(page.getByRole('status')).toContainText('Correct');
  await shot(page, 'm13-drill');
});
