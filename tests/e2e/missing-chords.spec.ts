import { expect, test } from '@playwright/test';
import { shot } from './helpers';

test('explorer: when no shape fits, the nearest shapes are shown faded', async ({ page }) => {
  await page.goto('./#/explore');
  await page.getByRole('button', { name: 'V', exact: true }).click(); // F♯m V = C♯
  await expect(page.locator('.no-fit')).toHaveText(
    'No shape fits frets 5–9 on strings 1–3 — nearest at frets 4–6 and 9–10 (faded)',
  );
  await expect(page.locator('[data-kind=outside]').first()).toBeVisible();
  expect(await page.locator('[data-kind=shown]').count()).toBe(0);
  await expect(page.getByRole('button', { name: '▶ Play' })).toBeEnabled();
  await shot(page, 'missing-explore-no-fit');
  // a chord that fits shows its shape normally, plus faded neighbours
  await page.getByRole('button', { name: 'i', exact: true }).click();
  await expect(page.getByTestId('note-2-7')).toHaveAttribute('data-kind', 'shown');
});

test('find the chord: F♯m V on strings 1–3 is asked, with the window widened', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('F#m');
  for (const n of ['i', 'iv', 'ii°', '♭VI', '♭VII']) {
    await page
      .getByRole('group', { name: 'Chords' })
      .getByRole('button', { name: n, exact: true })
      .click();
  }
  await page.getByRole('group', { name: 'Strings' }).getByRole('button', { name: '2–4' }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('.prompt-main')).toHaveText('F♯m · V');
  await expect(page.locator('.prompt-sub')).toHaveText('strings 1–3 · frets 5–10');
  await shot(page, 'missing-find-widened');
});
