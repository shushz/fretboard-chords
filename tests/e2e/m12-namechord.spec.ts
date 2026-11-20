import { expect, test } from '@playwright/test';
import { shot } from './helpers';

test('In E♭m, what is iv? → A♭m', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /Name the chord.*E♭m/ }).click();
  await page.getByRole('radio', { name: 'Degree → chord' }).click();
  await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('Ebm');
  for (const n of ['i', 'V', 'ii°', '♭VI', '♭VII']) {
    await page
      .getByRole('group', { name: 'Chords' })
      .getByRole('button', { name: n, exact: true })
      .click();
  }
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('.prompt-main')).toHaveText('In E♭m, what is iv?');
  await expect(page.getByRole('group', { name: 'Answers' })).toContainText('G♯m');
  await shot(page, 'm12-question');
  await page.getByRole('button', { name: 'A♭m', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('A♭m (A♭–C♭–E♭)');
  await shot(page, 'm12-correct');
});
