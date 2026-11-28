import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { makeBackup } from '../../src/progress/backup';
import { type ItemStats, updateStats } from '../../src/progress/stats';
import { appendLog } from '../../src/progress/log';
import { type Attempt, itemKey } from '../../src/progress/types';
import { DEFAULT_PREFERENCES } from '../../src/prefs/model';

test('reviews: one session a day at most, by question type, the rest waits', async ({ page }) => {
  // 24 question types missed yesterday (Find the chord: 6 minor-key chords × 4 string sets,
  // two keys each: 48 per-key items)
  const yesterday = Date.now() - 86_400_000;
  const as: Attempt[] = [];
  const sets = ['1-3', '2-4', '3-5', '4-6'] as const;
  const QUALITY = { 0: 'min', 1: 'dim', 3: 'min', 4: 'maj', 5: 'maj', 6: 'maj' } as const;
  for (const [i, set] of sets.entries())
    for (const degree of [0, 1, 3, 4, 5, 6] as const)
      for (const key of ['F#m', 'Cm'])
        as.push({
          item: {
            mode: 'find',
            key,
            degree,
            quality: QUALITY[degree],
            stringSet: set,
            inversion: '*',
            anchor: null,
          },
          correct: false,
          timeMs: 3000,
          at: yesterday + i * 1000 + degree * 10,
          sevenths: false,
        });
  const stats: Record<string, ItemStats> = {};
  for (const a of as) stats[itemKey(a.item)] = updateStats(stats[itemKey(a.item)], a);
  expect(Object.keys(stats)).toHaveLength(48); // per key
  mkdirSync('test-results', { recursive: true });
  writeFileSync(
    'test-results/review-cap.json',
    JSON.stringify(makeBackup(DEFAULT_PREFERENCES, stats, {}, Date.now(), appendLog([], as))),
  );
  await page.goto('./#/stats');
  page.on('dialog', (d) => void d.accept());
  await page.locator('input[type=file]').setInputFiles('test-results/review-cap.json');
  await page.waitForTimeout(500);
  await page.goto('./');
  // 24 question types due, not 48 items; 20 today (the session length)
  const review = page.getByRole('button', { name: /^Review due items/ });
  await expect(review).toContainText('20 for today');
  await expect(review).toContainText('the rest waits');
  await review.click();
  await expect(page.locator('.session-progress')).toHaveText('1/20');
  for (let i = 0; i < 20; i++) {
    await page.getByRole('button', { name: 'Show answer' }).click();
    await page.getByRole('button', { name: /^Next/ }).click();
  }
  await expect(page.getByText('Session complete')).toBeVisible();
  await page.goto('./');
  // today's reviews are done, even though some are still due
  await expect(page.getByRole('button', { name: /^Review due items/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: /^Practice/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Review due items/ })).toHaveCount(0);
});
