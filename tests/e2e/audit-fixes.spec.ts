import { expect, test } from '@playwright/test';

test('quality switch has "Show answer"', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /Quality switch/ }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.getByRole('button', { name: 'Show answer' }).click();
  // Asking for the answer isn't a mistake: neutral feedback, not "Not quite".
  await expect(page.getByRole('status')).toContainText('Answer:');
  await expect(page.getByRole('status')).not.toContainText('Not quite');
  await expect(page.getByRole('status')).toHaveClass(/shown/);
  await expect(page.locator('[data-kind=reveal]')).toHaveCount(1);
});

test('Show answer is neutral in tap modes', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /Find the chord/ }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.getByRole('button', { name: 'Show answer' }).click();
  await expect(page.getByRole('status')).toHaveClass(/shown/);
  await expect(page.getByRole('status')).toContainText('Answer:');
});

test('session status sits in the top bar; End session shows the summary', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('button', { name: /^Start/ }).click();
  const bar = page.locator('.topbar');
  await expect(bar.locator('.session-progress')).toHaveText('1 / 20');
  await expect(bar.locator('.session-score')).toHaveText('0 ✓');
  await bar.getByRole('button', { name: 'End session' }).click();
  await expect(page.getByText('Session complete')).toBeVisible();
  await expect(bar.locator('.session-progress')).toHaveCount(0);
  await expect(bar.getByRole('heading', { name: 'Practice' })).toBeVisible();
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
  await page.getByRole('button', { name: 'End session' }).click();
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

test.describe('small phone', () => {
  test.use({ viewport: { width: 360, height: 740 } });
  test('a board wider than the screen shows which side has more frets', async ({ page }) => {
    await page.goto('./#/practice');
    await page.getByRole('radio', { name: /^Next \/ previous shape/ }).click();
    await page.getByRole('radio', { name: 'Up ↑' }).click();
    await page.getByRole('button', { name: /^Start/ }).click();
    const frame = page.locator('.board-frame');
    const scrollable = await page
      .locator('.board-wrap')
      .evaluate((w) => w.scrollWidth > w.clientWidth + 2);
    if (scrollable) {
      const cues = await page.locator('.more-cue').count();
      expect(cues).toBeGreaterThan(0);
      const marked = await frame.evaluate(
        (f) => f.hasAttribute('data-more-left') || f.hasAttribute('data-more-right'),
      );
      expect(marked).toBe(true);
    }
  });
});

test('practice setup: key and chords are on the first phone screen', async ({ page }) => {
  await page.goto('./#/practice');
  const key = await page.getByRole('combobox', { name: 'Key', exact: true }).boundingBox();
  expect(key!.y + key!.height).toBeLessThan(915 - 80);
  await expect(page.locator('.mode-desc')).toHaveText(
    'Tap a diatonic chord in a region of the neck',
  );
});

test('progression walk counts chords, not progressions', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /^Progression walk/ }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('.session-progress')).toHaveText('0 / 20 chords');
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: /^(Next chord|Finish)$/ }).click();
  await expect(page.locator('.session-progress')).toHaveText('1 / 20 chords');
});

test('progress: trend charts, chord-by-string-set map, practise a cell', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('button', { name: /^Start/ }).click();
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Show answer' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByRole('button', { name: 'End session' }).click();
  await page.goto('./#/stats');
  await expect(page.getByRole('heading', { name: 'Getting better?' })).toBeVisible();
  await expect(page.locator('.line-chart')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'What to practise' })).toBeVisible();
  await expect(page.locator('.fn-grid thead')).toContainText(/1–3|2–4/); // questions pick either string set
  const cell = page.locator('.cell-btn').first();
  await cell.click();
  await expect(page.locator('.fn-chip')).toContainText('in minor keys');
  await page.getByRole('button', { name: 'Practise this' }).click();
  await expect(page.locator('.topbar h1')).toBeVisible();
});
