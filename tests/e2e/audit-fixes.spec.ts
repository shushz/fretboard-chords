import { expect, test } from '@playwright/test';

test('quality switch has "Show answer"', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /Quality switch/ }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.getByRole('button', { name: 'Show answer' }).click();
  await expect(page.getByRole('status')).toContainText('Not quite');
  await expect(page.locator('[data-kind=reveal]')).toHaveCount(1);
});

test('name the tones: a wrong label keeps the role colour and explains each string', async ({
  page,
}) => {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /Name the tones/ }).click();
  await page.getByRole('radio', { name: 'Label the notes' }).click();
  await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('F#m');
  for (const n of ['iv', 'V', 'ii°', '♭VI', '♭VII']) {
    await page
      .getByRole('group', { name: 'Chords' })
      .getByRole('button', { name: n, exact: true })
      .click();
  }
  await page.getByRole('group', { name: 'Strings' }).getByRole('button', { name: '2–4' }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  // F♯m on 1–3 in 5–9: string 3 = 5, string 2 = R, string 1 = ♭3. Answer R, R, R.
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Role R' }).click();
  await expect(page.getByRole('status')).toContainText(
    'string 3 = 5 (C♯), not R · string 2 = R (F♯) · string 1 = ♭3 (A), not R',
  );
  const missed = page.locator('[data-kind=missed]');
  await expect(missed).toHaveCount(2);
  expect(await missed.first().locator('circle').getAttribute('style')).toContain('fill');
});

test('session summary median time counts correct answers only', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'End' }).click();
  await expect(page.locator('.big-stats')).toContainText('0.0 s');
});

test.describe('landscape', () => {
  test.use({ viewport: { width: 915, height: 412 } });
  test('side-column buttons are on one line each', async ({ page }) => {
    await page.goto('./#/practice');
    await page.getByRole('button', { name: /^Start/ }).click();
    const b = await page.getByRole('button', { name: 'Show answer' }).boundingBox();
    expect(b!.height).toBeLessThan(60);
  });
});
