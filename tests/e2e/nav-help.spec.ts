import { expect, test } from '@playwright/test';
import { shot } from './helpers';

test('home: one way into Preferences, Help & about, version and GitHub link', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('button', { name: /^Preferences/ })).toHaveCount(1); // the gear only
  await expect(page.getByRole('button', { name: /^Help & about/ })).toBeVisible();
  await expect(page.locator('.version')).toContainText(/Updated .+\d{4}/);
  await expect(page.getByRole('link', { name: 'Source on GitHub' })).toHaveAttribute(
    'href',
    'https://github.com/shushz/fretboard-chords',
  );
  await expect(page.locator('.welcome')).toHaveCount(0);
  await shot(page, 'nav-home');
});

test('help & about explains the app and how to get in touch', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /^Help & about/ }).click();
  for (const h of [
    'Getting started',
    'Main ideas',
    'The practice modes',
    'Privacy',
    'Contact & source',
  ]) {
    await expect(page.getByRole('heading', { name: h })).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'Open an issue on GitHub' })).toHaveAttribute(
    'href',
    /github\.com\/shushz\/fretboard-chords\/issues\/new/,
  );
  await shot(page, 'nav-about');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'Fretboard Chords' })).toBeVisible();
});

test('setup explains each mode', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByText('How it works').click();
  await expect(page.locator('.mode-help p')).toContainText('Tap its notes');
});

test('preferences during a session: Back returns to the same session', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('.session-progress')).toHaveText('2/20');
  const prompt = await page.locator('.prompt-main').textContent();
  await page.getByRole('button', { name: 'Preferences' }).click();
  await expect(page.getByRole('heading', { name: 'Preferences' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  // same session, same unanswered question (nothing changed)
  await expect(page.locator('.session-progress')).toHaveText('2/20');
  await expect(page.locator('.prompt-main')).toHaveText(prompt!);
  await expect(page.getByRole('button', { name: 'Show answer' })).toBeVisible();
});

test('a setting changed mid-question takes effect when you come back', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /^From the tonic/ }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('[data-kind=shown] text')).toHaveCount(3); // roles shown
  await page.getByRole('button', { name: 'Preferences' }).click();
  await page.getByRole('switch', { name: /Show roles on the given shape/ }).uncheck();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.locator('.session-progress')).toHaveText('1/20');
  await expect(page.locator('[data-kind=shown]')).toHaveCount(3);
  await expect(page.locator('[data-kind=shown] text')).toHaveCount(0); // hint now hidden
});
