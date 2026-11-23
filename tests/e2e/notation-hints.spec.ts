import { expect, test, type Page } from '@playwright/test';
import { shot } from './helpers';

test('notation settings are gone; music symbols are always used', async ({ page }) => {
  await page.goto('./#/prefs');
  await expect(page.getByText('Accidental symbols', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Diminished labels', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Role labels', { exact: true })).toHaveCount(0);
  await page.goto('./#/explore');
  await expect(page.getByTestId('note-1-5')).toHaveText('♭3');
  await page.getByRole('radio', { name: 'Sevenths' }).click();
  await page.getByRole('button', { name: 'iiø7', exact: true }).click();
  await expect(page.locator('.prompt-main')).toContainText('G♯ø7');
});

async function startTonic(page: Page) {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /From the tonic/ }).click();
  await page.getByRole('radio', { name: 'Inside the fret window' }).click();
  await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('F#m');
  await page.getByRole('group', { name: 'Strings' }).getByRole('button', { name: '2–4' }).click();
}

test('From the tonic: roles and colors on the given shape can be hidden', async ({ page }) => {
  await startTonic(page);
  const toggle = page.getByRole('switch', { name: /Show roles on the given shape/ });
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await page.getByRole('button', { name: /^Start/ }).click();
  const shown = page.locator('[data-kind=shown]');
  await expect(shown).toHaveCount(3);
  for (const m of await shown.all()) {
    await expect(m.locator('text')).toHaveCount(0); // no role label
    expect(await m.locator('circle').getAttribute('style')).toBeNull(); // no role color
  }
  await expect(page.locator('.prompt-hint')).not.toContainText('inversion');
  await shot(page, 'hint-off-question');
  await page.getByRole('button', { name: 'Show answer' }).click();
  // after answering, the given shape is labeled and colored
  await expect(page.locator('[data-kind=given] text').first()).toBeVisible();
  await shot(page, 'hint-off-answered');

  // the setting persists and also shows in Preferences
  await page.goto('./#/prefs');
  await expect(
    page.getByRole('switch', { name: /Show roles on the given shape/ }),
  ).not.toBeChecked();
});

test('From the tonic: roles shown by default', async ({ page }) => {
  await startTonic(page);
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('[data-kind=shown] text')).toHaveCount(3);
});
