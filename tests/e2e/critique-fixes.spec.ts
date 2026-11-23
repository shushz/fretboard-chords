import { expect, test } from '@playwright/test';

test.describe('small phone', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('top bar: End session stays on one line, clear of the sound button', async ({ page }) => {
    await page.goto('./#/practice');
    await page.getByRole('radio', { name: /^Progression walk/ }).click();
    await page.getByRole('button', { name: /^Start/ }).click();
    const end = await page.getByRole('button', { name: 'End session' }).boundingBox();
    const mute = await page.getByRole('button', { name: /^(Mute|Unmute)$/ }).boundingBox();
    expect(end!.height).toBeLessThanOrEqual(48); // one line (44 px tap target)
    expect(end!.x + end!.width).toBeLessThanOrEqual(mute!.x);
    await expect(page.locator('.session-progress')).toHaveText('0/20');
  });
});

test('Show answer in a progression marks the step neutral, not red', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /^Progression walk/ }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.getByRole('button', { name: 'Show answer' }).click();
  const first = page.locator('.prog-step').first();
  await expect(first).toHaveClass(/shown/);
  await expect(first).not.toHaveClass(/bad/);
});

test('summary: no right answers means no median time', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: 'End session' }).click();
  const stats = page.locator('.summary .big-stats');
  await expect(stats).toContainText('0%');
  await expect(stats).toContainText('–');
  await expect(stats).not.toContainText('0.0 s');
});

test.describe('portrait tablet', () => {
  test.use({ viewport: { width: 820, height: 1180 } });

  test('the board spans the width (stacked layout, not the side column)', async ({ page }) => {
    await page.goto('./#/practice');
    await page.getByRole('button', { name: /^Start/ }).click();
    const board = await page.locator('.board-frame').boundingBox();
    expect(board!.width).toBeGreaterThan(700);
  });
});
