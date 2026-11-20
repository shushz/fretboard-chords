import { expect, test } from '@playwright/test';

test('home screen renders', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Fretboard Chords' })).toBeVisible();
});
