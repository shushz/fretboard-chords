import { expect, test, type Page } from '@playwright/test';
import { shot } from './helpers';

async function setup(page: Page, variant: string, keep: string) {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /Name the tones/ }).click();
  await page.getByRole('radio', { name: variant }).click();
  await page.getByLabel('Key').selectOption('F#m');
  for (const n of ['i', 'iv', 'V', 'ii°', '♭VI', '♭VII'].filter((x) => x !== keep)) {
    await page
      .getByRole('group', { name: 'Chords' })
      .getByRole('button', { name: n, exact: true })
      .click();
  }
  await page.getByRole('group', { name: 'Strings' }).getByRole('button', { name: '2–4' }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
}

test('label the notes of F#m (5, R, b3)', async ({ page }) => {
  await setup(page, 'Label the notes', 'i');
  await expect(page.locator('.prompt-hint')).toHaveText('What is the note on string 3?');
  await page.getByRole('button', { name: 'Role 5' }).click();
  await page.getByRole('button', { name: 'Role R' }).click();
  await shot(page, 'm09-label');
  await page.getByRole('button', { name: 'Role b3' }).click();
  await expect(page.getByRole('status')).toContainText('Correct');
  await shot(page, 'm09-label-correct');
});

test('tap the 3 of V on a string', async ({ page }) => {
  await setup(page, 'Tap the role', 'V');
  const main = await page.locator('.prompt-main').textContent();
  expect(main).toMatch(/^Tap the (R|3|5) of V$/);
  await shot(page, 'm09-tap');
  await page.getByRole('button', { name: 'Show answer' }).click();
  await expect(page.getByRole('status')).toContainText('V = C♯ (C♯–E♯–G♯)');
  await expect(page.locator('[data-kind=reveal]').first()).toBeVisible();
});
