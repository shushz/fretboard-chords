import { expect, test, type Page } from '@playwright/test';

async function tap(page: Page, s: number, f: number) {
  await page
    .getByRole('button', { name: new RegExp(`^String ${s} fret ${f}\\b`) })
    .dispatchEvent('pointerdown');
}

async function onlyChord(page: Page, keep: string) {
  for (const n of ['i', 'ii°', 'iv', 'V', '♭VI', '♭VII']) {
    const b = page
      .getByRole('group', { name: 'Chords' })
      .getByRole('button', { name: n, exact: true });
    const on = (await b.getAttribute('aria-pressed')) === 'true';
    if (on !== (n === keep)) await b.click();
  }
}

async function onlyStrings(page: Page, keep: string) {
  for (const n of ['1–3', '2–4', '3–5', '4–6']) {
    const b = page.getByRole('group', { name: 'Strings' }).getByRole('button', { name: n });
    if ((await b.count()) === 0) continue;
    const on = (await b.getAttribute('aria-pressed')) === 'true';
    if (on !== (n === keep)) await b.click();
  }
}

// Wide enough that the board shows frets well outside the window.
test.use({ viewport: { width: 1280, height: 800 } });

test('Find the chord: a tap outside the window is ignored, with a note', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /^Find the chord/ }).click();
  await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('F#m');
  await onlyChord(page, 'i');
  await onlyStrings(page, '1–3');
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('.prompt-sub')).toContainText('frets 5–9');
  // F♯m at fret 2: all three taps are outside frets 5–9, so none registers
  await tap(page, 1, 2);
  await tap(page, 2, 2);
  await tap(page, 3, 2);
  await expect(page.locator('.outside-tap')).toContainText('outside frets 5–9');
  await expect(page.getByRole('status')).toHaveCount(0); // not graded
  await expect(page.locator('[data-kind=tap]')).toHaveCount(0);
  // inside the window, taps work as usual
  await tap(page, 1, 5);
  await expect(page.locator('.outside-tap')).toHaveCount(0);
  await expect(page.locator('[data-kind=tap]')).toHaveCount(1);
});

test('with "Allow one note outside the window", a tap one fret outside registers', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Preferences' }).click();
  await page.getByRole('switch', { name: 'Allow one note outside the window' }).check();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: /^Practice/ }).click();
  await page.getByRole('radio', { name: /^Find the chord/ }).click();
  await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('F#m');
  await onlyChord(page, 'i');
  await onlyStrings(page, '1–3');
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('.prompt-sub')).toContainText('frets 5–9');
  await tap(page, 1, 10); // one fret past the window
  await expect(page.locator('[data-kind=tap]')).toHaveCount(1);
  await tap(page, 2, 11); // two frets past: ignored
  await expect(page.locator('[data-kind=tap]')).toHaveCount(1);
  await expect(page.locator('.outside-tap')).toBeVisible();
});
