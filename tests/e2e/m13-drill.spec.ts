import { expect, test, type Page } from '@playwright/test';
import { shot } from './helpers';

async function tap(page: Page, s: number, f: number) {
  await page
    .getByRole('button', { name: new RegExp(`^String ${s} fret ${f}\\b`) })
    .dispatchEvent('pointerdown');
}

/** F♯m i on strings 1–3, revealed three times: one weak item. */
async function missOneItemThreeTimes(page: Page) {
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
    await page.getByRole('button', { name: 'Show answer' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByRole('button', { name: 'End session' }).click();
  await page.waitForTimeout(400);
}

test('weak items can be drilled from the stats screen; due items offered on home', async ({
  page,
}) => {
  await missOneItemThreeTimes(page);

  await page.goto('./');
  await expect(page.getByRole('button', { name: /Review due items \(1\)/ })).toBeVisible();
  await shot(page, 'm13-home-review');

  await page.goto('./#/stats');
  await page.getByRole('button', { name: 'Practice these' }).click();
  // phone portrait: the title sits under the top bar, which keeps the session status
  await expect(page.locator('.topbar h1')).toBeHidden();
  await expect(page.locator('.drill-item')).toHaveText('Weak spots · F♯m · i · 1–3');
  await expect(page.locator('.drill-title')).toBeVisible();
  await expect(page.locator('.prompt-main')).toHaveText('F♯m · i');
  await tap(page, 1, 5);
  await tap(page, 3, 6);
  await tap(page, 2, 7);
  await expect(page.getByRole('status')).toContainText('Correct');
  await shot(page, 'm13-drill');
});

test.describe('landscape', () => {
  test.use({ viewport: { width: 915, height: 412 } });
  test('a review keeps its title in the top bar', async ({ page }) => {
    await missOneItemThreeTimes(page);
    await page.goto('./#/stats');
    await page.getByRole('button', { name: 'Practice these' }).click();
    await expect(page.locator('.topbar h1')).toHaveText('Weak spots');
    await expect(page.locator('.topbar h1')).toBeVisible();
    await expect(page.locator('.drill-title')).toBeHidden();
  });
});
