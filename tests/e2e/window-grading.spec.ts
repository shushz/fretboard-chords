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

test('Find the chord: the right chord outside the window is told apart from a mistake', async ({
  page,
}) => {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /^Find the chord/ }).click();
  await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('F#m');
  await onlyChord(page, 'i');
  await onlyStrings(page, '1–3');
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('.prompt-sub')).toContainText('frets 5–9');
  // F♯m at fret 2 on strings 1–3: right chord, outside frets 5–9
  await tap(page, 1, 2);
  await tap(page, 2, 2);
  await tap(page, 3, 2);
  const status = page.getByRole('status');
  await expect(status).toContainText('Right chord, but outside frets 5–9');
  await expect(status).toHaveClass(/shown/);
  await expect(status).not.toContainText('Not quite');
  await expect(page.locator('[data-kind=wrong]')).toHaveCount(0);
});
