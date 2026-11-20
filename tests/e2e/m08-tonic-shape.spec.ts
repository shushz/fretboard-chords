import { expect, test, type Page } from '@playwright/test';
import { shot } from './helpers';

async function tap(page: Page, s: number, f: number) {
  await page
    .getByRole('button', { name: new RegExp(`^String ${s} fret ${f}\\b`) })
    .dispatchEvent('pointerdown');
}

async function setup(page: Page, mode: string, keep: string) {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: new RegExp(mode) }).click();
  await page.getByLabel('Key').selectOption('F#m');
  for (const n of ['i', 'iv', 'V', 'ii°', '♭VI', '♭VII'].filter((x) => x !== keep)) {
    await page
      .getByRole('group', { name: 'Chords' })
      .getByRole('button', { name: n, exact: true })
      .click();
  }
  await page.getByRole('group', { name: 'Strings' }).getByRole('button', { name: '2–4' }).click();
}

test('mode 2: from the tonic, smooth badge', async ({ page }) => {
  await setup(page, 'From the tonic', 'iv');
  await page.getByRole('radio', { name: 'Inside the fret window' }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('.prompt-main')).toHaveText('F♯m · i → iv');
  await expect(page.getByTestId('note-3-6')).toHaveAttribute('data-kind', 'shown');
  await shot(page, 'm08-tonic-question');
  await tap(page, 3, 7);
  await tap(page, 2, 7);
  await tap(page, 1, 7);
  await expect(page.getByRole('status')).toContainText('Correct');
  await expect(page.getByRole('status')).toContainText('Smooth');
  await shot(page, 'm08-tonic-smooth');
});

test('mode 2: tonic shape anywhere on the neck by default; consecutive questions differ', async ({
  page,
}) => {
  await setup(page, 'From the tonic', 'iv');
  await expect(page.getByRole('radio', { name: 'Anywhere on the neck' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByRole('button', { name: /^Start/ }).click();
  const seen: string[] = [];
  for (let i = 0; i < 4; i++) {
    const shown = await page.locator('[data-kind=shown]').evaluateAll((els) =>
      els
        .map((e) => e.getAttribute('data-testid'))
        .sort()
        .join(','),
    );
    seen.push(shown);
    await page.getByRole('button', { name: 'Show answer' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
  }
  // only one target (iv) is selected, so the tonic shape must change every time
  for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
});

test('mode 3: next shape up', async ({ page }) => {
  await setup(page, 'Next / previous shape', 'i');
  await page.getByRole('radio', { name: 'Up ↑' }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('.prompt-main')).toHaveText('F♯m · next shape ↑');
  await shot(page, 'm08-shape-question');
  await tap(page, 3, 11);
  await tap(page, 2, 10);
  await tap(page, 1, 9);
  await expect(page.getByRole('status')).toContainText('Correct');
  await expect(page.getByRole('status')).toContainText('second inversion → root position');
  await shot(page, 'm08-shape-correct');
});
