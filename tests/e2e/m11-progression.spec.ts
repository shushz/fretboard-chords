import { expect, test, type Page } from '@playwright/test';
import { shot } from './helpers';

async function tap(page: Page, s: number, f: number) {
  await page
    .getByRole('button', { name: new RegExp(`^String ${s} fret ${f}\\b`) })
    .dispatchEvent('pointerdown');
}

test('walk i–iv–V–i in F#m', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /Progression walk/ }).click();
  await page.getByLabel('Key', { exact: true }).selectOption('F#m');
  await page.getByLabel('Progression').selectOption('i-iv-V-i');
  await page.getByRole('group', { name: 'Strings' }).getByRole('button', { name: '2–4' }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('.prog-strip')).toHaveText('iivVi');
  // i
  await tap(page, 1, 5);
  await tap(page, 3, 6);
  await tap(page, 2, 7);
  await expect(page.getByRole('status')).toContainText('Correct');
  // auto-advances to iv
  await expect(page.locator('.prompt-main')).toHaveText('F♯m · iv');
  await expect(page.getByTestId('note-3-6')).toHaveAttribute('data-kind', 'ghost');
  await shot(page, 'm11-step2');
  await tap(page, 3, 7);
  await tap(page, 2, 7);
  await tap(page, 1, 7);
  await expect(page.getByRole('status')).toContainText('Smooth');
  await expect(page.locator('.prompt-main')).toHaveText('F♯m · V');
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: 'Next chord' }).click();
  await expect(page.locator('.prompt-main')).toHaveText('F♯m · i');
  await tap(page, 1, 5);
  await tap(page, 3, 6);
  await tap(page, 2, 7);
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByRole('status')).toContainText('3/4 chords found');
  await shot(page, 'm11-done');
});

test('tempo mode times out', async ({ page }) => {
  await page.goto('./#/prefs');
  // fastest tempo: 1 beat at 160 BPM = 375 ms
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: 'Decrease Beats per chord' }).click();
  for (let i = 0; i < 20; i++)
    await page.getByRole('button', { name: 'Increase Progression tempo (BPM)' }).click();
  await page.waitForTimeout(300);
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /Progression walk/ }).click();
  await page.getByRole('switch', { name: /Tempo mode/ }).check();
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.getByRole('status')).toContainText("Time's up", { timeout: 3000 });
});
