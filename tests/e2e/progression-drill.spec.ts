import { expect, test, type Page } from '@playwright/test';
import { shot } from './helpers';

test('progression list with random keys from both modes offers every progression', async ({
  page,
}) => {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /Progression walk/ }).click();
  await page.getByRole('radio', { name: 'Random key' }).click();
  await page.getByRole('radio', { name: 'Both' }).first().click();
  const select = page.getByRole('combobox', { name: 'Progression' });
  await expect(select.locator('option')).toHaveCount(11);
  await select.selectOption({ label: 'I–vi–ii–V (major)' });
  await shot(page, 'progression-list-both');
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('.prog-strip')).toHaveText('IviiiV');
  // a major key: no "m" after the tonic
  await expect(page.locator('.prompt-main')).toHaveText(/^[A-G][♭♯]? · I$/);
});

async function missThreeTimes(page: Page) {
  await page.goto('./#/practice');
  await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('F#m');
  for (const n of ['i', 'V', 'ii°', '♭VI', '♭VII']) {
    await page
      .getByRole('group', { name: 'Chords' })
      .getByRole('button', { name: n, exact: true })
      .click();
  }
  await page.getByRole('group', { name: 'Strings' }).getByRole('button', { name: '2–4' }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Show answer' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByRole('button', { name: 'End session' }).click();
  await page.waitForTimeout(400);
}

test('reviewing one due item asks it once, not over and over', async ({ page }) => {
  await missThreeTimes(page);
  await page.goto('./');
  await page.getByRole('button', { name: /Review due items \(1\)/ }).click();
  await expect(page.locator('.session-progress')).toHaveText('1/1');
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Session complete')).toBeVisible();
});

test('drilling one weak item twice uses a different fret window the second time', async ({
  page,
}) => {
  await missThreeTimes(page);
  await page.goto('./#/stats');
  await page.getByRole('button', { name: 'Practice these' }).click();
  await expect(page.locator('.session-progress')).toHaveText('1/2');
  const first = await page.locator('.prompt-sub').textContent();
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('.session-progress')).toHaveText('2/2');
  await expect(page.locator('.prompt-main')).toHaveText('F♯m · iv');
  const second = await page.locator('.prompt-sub').textContent();
  expect(second).not.toBe(first);
  await shot(page, 'drill-second-window');
});
