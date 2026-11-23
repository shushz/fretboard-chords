import { expect, test, type Page } from '@playwright/test';
import { shot } from './helpers';

async function tap(page: Page, s: number, f: number) {
  await page
    .getByRole('button', { name: new RegExp(`^String ${s} fret ${f}\\b`) })
    .dispatchEvent('pointerdown');
}

async function setupSingle(page: Page) {
  await page.goto('./#/practice');
  await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('F#m');
  // keep only "i": deselect others in the core set
  for (const n of ['iv', 'V', 'ii°', '♭VI', '♭VII']) {
    await page
      .getByRole('group', { name: 'Chords' })
      .getByRole('button', { name: n, exact: true })
      .click();
  }
  await page.getByRole('group', { name: 'Strings' }).getByRole('button', { name: '2–4' }).click();
}

test('find the chord: correct, wrong, summary', async ({ page }) => {
  await setupSingle(page);
  await shot(page, 'm06-setup');
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('.prompt-main')).toHaveText('F♯m · i');
  await expect(page.locator('.prompt-sub')).toHaveText('strings 1–3 · frets 5–9');
  await shot(page, 'm06-question');

  // Correct answer: SPEC example
  await tap(page, 1, 5);
  await tap(page, 3, 6);
  await tap(page, 2, 7);
  await expect(page.getByRole('status')).toContainText('Correct');
  await expect(page.getByRole('status')).toContainText('second inversion');
  await shot(page, 'm06-correct');
  await page.getByRole('button', { name: 'Next' }).click();

  // Wrong answer
  await expect(page.locator('.session-progress')).toHaveText('2/20');
  await tap(page, 1, 5);
  await tap(page, 2, 5);
  await tap(page, 3, 5);
  await expect(page.getByRole('status')).toContainText('Not quite');
  await expect(page.getByTestId('note-2-7')).toHaveAttribute('data-kind', 'reveal');
  await shot(page, 'm06-wrong');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page.getByText('Session complete')).toBeVisible();
  await expect(page.locator('.big-stats')).toContainText('1/2');
  await shot(page, 'm06-summary');
});

test('anchored variant asks for the root on string 6/5', async ({ page }) => {
  await setupSingle(page);
  const strings = page.getByRole('group', { name: 'Strings' });
  await strings.getByRole('button', { name: '2–4' }).click();
  await strings.getByRole('button', { name: '1–3' }).click(); // only 2–4
  await page.getByRole('switch', { name: /Also tap the root/ }).check();
  await page.getByRole('button', { name: /^Start/ }).click();
  const hint = page.locator('.prompt-hint');
  await expect(hint).toContainText('Tap the root on string');
  const s = (await hint.textContent())!.includes('string 5') ? 5 : 6;
  // F#m on 2–4 in 5–9: 4:7, 3:6, 2:7; root on 5 at 9, on 6 at... 2/14 (outside ±2) → only 5 possible
  expect(s).toBe(5);
  await tap(page, 5, 9);
  await tap(page, 4, 7);
  await tap(page, 3, 6);
  await tap(page, 2, 7);
  await expect(page.getByRole('status')).toContainText('Correct');
  await shot(page, 'm06-anchored');
});
