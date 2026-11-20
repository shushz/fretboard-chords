import { expect, test } from '@playwright/test';
import { shot } from './helpers';

test('random key: a different key on consecutive questions', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: 'Random key' }).click();
  await page.getByRole('radio', { name: 'Both' }).first().click();
  await expect(page.getByRole('group', { name: 'Major-key chords' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Minor-key chords' })).toBeVisible();
  await shot(page, 'random-key-setup');
  await page.getByRole('button', { name: /^Start/ }).click();
  const keys: string[] = [];
  for (let i = 0; i < 6; i++) {
    const main = (await page.locator('.prompt-main').textContent())!;
    keys.push(main.split(' · ')[0]);
    await page.getByRole('button', { name: 'Show answer' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
  }
  for (let i = 1; i < keys.length; i++) expect(keys[i]).not.toBe(keys[i - 1]);
  expect(new Set(keys).size).toBeGreaterThan(2);
});

test('random key setup is remembered', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: 'Random key' }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.getByRole('button', { name: 'End' }).click();
  await page.goto('./');
  await page.reload();
  await page.goto('./#/practice');
  await expect(page.getByRole('radio', { name: 'Random key' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});
