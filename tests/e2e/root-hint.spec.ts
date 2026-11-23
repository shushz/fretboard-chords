import { expect, test, type Page } from '@playwright/test';

/** Find the chord, F♯m i on strings 1–3, frets 5–9: the nearby bass root is string 5, fret 9. */
async function startFind(page: Page) {
  await page.getByRole('button', { name: /^Practice/ }).click();
  await page.getByRole('radio', { name: /^Find the chord/ }).click();
  await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('F#m');
  for (const n of ['iv', 'V', 'ii°', '♭VI', '♭VII']) {
    const b = page
      .getByRole('group', { name: 'Chords' })
      .getByRole('button', { name: n, exact: true });
    if ((await b.getAttribute('aria-pressed')) === 'true') await b.click();
  }
  const two = page.getByRole('group', { name: 'Strings' }).getByRole('button', { name: '2–4' });
  if ((await two.getAttribute('aria-pressed')) === 'true') await two.click();
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('.prompt-sub')).toHaveText('strings 1–3 · frets 5–9');
}

/** Change the hint in Preferences and come back to Home, as a user would. */
async function setHint(page: Page, label: string) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Preferences' }).click();
  const group = page.getByRole('radiogroup', { name: 'Root on string 6 / 5' });
  await group.getByRole('radio', { name: label }).click();
  await expect(group.getByRole('radio', { name: label })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Back' }).click();
}

const root = (page: Page) => page.getByTestId('note-5-9');

test('default: the root on string 5 appears only after answering', async ({ page }) => {
  await page.goto('./');
  await startFind(page);
  await expect(root(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Show answer' }).click();
  await expect(root(page)).toHaveAttribute('data-kind', 'ghost');
});

test('"While answering" shows it before the answer', async ({ page }) => {
  await setHint(page, 'While answering');
  await startFind(page);
  await expect(root(page)).toHaveAttribute('data-kind', 'ghost');
});

test('"Never" shows it at no point, whatever else is set', async ({ page }) => {
  await setHint(page, 'Never');
  await startFind(page);
  await expect(root(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Show answer' }).click();
  await expect(page.locator('[data-kind=ghost]')).toHaveCount(0);
});

test('the setup has no Root anchor control; Find the chord has the root-tap switch', async ({
  page,
}) => {
  await page.goto('./#/practice');
  await expect(page.getByRole('radiogroup', { name: 'Root anchor' })).toHaveCount(0);
  await page.getByRole('radio', { name: /^From the tonic/ }).click();
  await expect(page.getByRole('switch', { name: /Also tap the root/ })).toHaveCount(0);
  await page.getByRole('radio', { name: /^Find the chord/ }).click();
  await expect(page.getByRole('switch', { name: /Also tap the root/ })).toBeVisible();
});
