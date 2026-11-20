import { expect, test, type Page } from '@playwright/test';
import { shot } from './helpers';

async function tap(page: Page, s: number, f: number) {
  await page
    .getByRole('button', { name: new RegExp(`^String ${s} fret ${f}\\b`) })
    .dispatchEvent('pointerdown');
}

async function setup(page: Page) {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /Quality switch/ }).click();
  await page.getByLabel('Key', { exact: true }).selectOption('D');
  for (const n of ['IV', 'V', 'ii', 'vi']) {
    await page
      .getByRole('group', { name: 'Chords' })
      .getByRole('button', { name: n, exact: true })
      .click();
  }
  await page.getByRole('group', { name: 'Strings' }).getByRole('button', { name: '2–4' }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
}

test('D major → minor by moving the 3rd', async ({ page }) => {
  await setup(page);
  await expect(page.locator('.prompt-main')).toHaveText('D → minor');
  await shot(page, 'm10-question');
  await tap(page, 2, 7); // select F#
  await expect(page.locator('.prompt-hint')).toHaveText('Now tap where it goes.');
  await tap(page, 2, 6);
  await expect(page.getByRole('status')).toContainText('Correct');
  await expect(page.getByRole('status')).toContainText('Dm (D–F–A)');
  await shot(page, 'm10-correct');
});

test('moving a note that should stay is an error; name-the-chord option', async ({ page }) => {
  await page.goto('./#/prefs');
  await page.getByRole('switch', { name: 'Name the new chord afterwards' }).check();
  await page.waitForTimeout(300);
  await setup(page);
  await tap(page, 3, 6); // D (root) moved: wrong
  await expect(page.getByRole('status')).toContainText('That note stays');
  await expect(page.getByTestId('note-2-6')).toHaveAttribute('data-kind', 'reveal');
  await page.getByRole('button', { name: 'Dm', exact: true }).click();
  await expect(page.locator('.name-step')).toContainText('✓ D → Dm');
  await shot(page, 'm10-wrong-named');
  await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
});
