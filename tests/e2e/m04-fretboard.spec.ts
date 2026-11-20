import { expect, test } from '@playwright/test';
import { shot } from './helpers';

test('explore shows F#m voicings with roles in the region', async ({ page }) => {
  await page.goto('./#/explore');
  await expect(page.getByText('F♯m', { exact: false }).first()).toBeVisible();
  // SPEC §4 example: s3 f6 = 5, s2 f7 = R, s1 f5 = b3
  await expect(page.getByTestId('note-3-6')).toContainText('5');
  await expect(page.getByTestId('note-2-7')).toContainText('R');
  await expect(page.getByTestId('note-1-5')).toContainText('♭3');
  await shot(page, 'm04-explore-light');
});

test('tap input adds a marker', async ({ page }) => {
  await page.goto('./#/explore');
  await page
    .getByRole('button', { name: 'String 4 fret 8', exact: true })
    .dispatchEvent('pointerdown');
  await expect(page.getByTestId('note-4-8')).toHaveAttribute('data-kind', 'tap');
});

test('preferences persist (left-handed, dark theme)', async ({ page }) => {
  await page.goto('./#/prefs');
  await page.getByRole('switch', { name: 'Left-handed' }).check();
  await page.getByRole('radio', { name: 'Dark' }).click();
  await shot(page, 'm04-prefs-dark');
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Left-handed' })).toBeChecked();
  await page.goto('./#/explore');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await shot(page, 'm04-explore-dark-lefty');
});

test('home', async ({ page }) => {
  await page.goto('./');
  await shot(page, 'm04-home');
});
