import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { type DayStats, type ItemStats, updateDaily, updateStats } from '../../src/progress/stats';
import { appendLog } from '../../src/progress/log';
import { makeBackup } from '../../src/progress/backup';
import { type Attempt, itemKey } from '../../src/progress/types';
import { DEFAULT_PREFERENCES } from '../../src/prefs/model';
import { CURRICULUM } from '../../src/guided/curriculum';

/** A backup in which every target of the first step was answered right 5 times, quickly. */
function firstStepSolidBackup(): string {
  const keys = ['C', 'G', 'D', 'A', 'E'];
  const as: Attempt[] = CURRICULUM[0].targets.flatMap((t, j) =>
    keys.map((key, i) => ({
      item: {
        mode: t.mode,
        key,
        degree: t.degree,
        quality: t.degree === 4 || t.degree === 3 ? ('maj' as const) : ('min' as const),
        stringSet: t.stringSet,
        inversion: t.inversion ?? 'root',
        anchor: null,
      },
      correct: true,
      timeMs: 2000,
      at: Date.now() - 3_600_000 + (j * 5 + i) * 10_000,
      sevenths: false,
    })),
  );
  const stats: Record<string, ItemStats> = {};
  let daily: Record<string, DayStats> = {};
  for (const a of as) {
    stats[itemKey(a.item)] = updateStats(stats[itemKey(a.item)], a);
    daily = updateDaily(daily, a);
  }
  mkdirSync('test-results', { recursive: true });
  const file = 'test-results/guided-step1.json';
  writeFileSync(
    file,
    JSON.stringify(makeBackup(DEFAULT_PREFERENCES, stats, daily, Date.now(), appendLog([], as))),
  );
  return file;
}

async function importBackup(page: Page, file: string) {
  await page.goto('./#/stats');
  page.on('dialog', (d) => void d.accept());
  await page.locator('input[type=file]').setInputFiles(file);
  await expect(page.getByText(/^Imported/)).toBeVisible();
  await page.waitForTimeout(500); // saved
}

test('Guided practice starts at step 1 with new questions from the tonic', async ({ page }) => {
  await page.goto('./');
  const entry = page.getByRole('button', { name: /^Guided practice/ });
  await expect(entry).toContainText(`Step 1 of ${CURRICULUM.length}`);
  await entry.click();
  await expect(page.locator('.drill-item')).toContainText('New');
  await expect(page.locator('.drill-item')).toContainText('I (root position) →');
  await expect(page.locator('.prompt-hint')).toContainText("Here's the I (root position)");
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('.session-progress')).toHaveText('2/20');
  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page.locator('.guided-summary')).toContainText('Step 1 of');
  await expect(page.getByRole('button', { name: 'Next session' })).toBeVisible();
});

test('practice done earlier counts: a solid first step is passed when guided practice opens', async ({
  page,
}) => {
  await importBackup(page, firstStepSolidBackup());
  await page.goto('./');
  await page.getByRole('button', { name: /^Guided practice/ }).click();
  // step 2 is current: new questions are about ii and vi
  await expect(page.locator('.drill-item')).toContainText(/→ (ii|vi)/);
  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page.locator('.guided-summary')).toContainText('Step 2 of');
  await page.goto('./#/stats');
  await page.getByText('All steps', { exact: true }).click();
  await expect(page.locator('.guided-steps li.done')).toHaveCount(1);
  await expect(page.locator('.guided-steps li.current')).toContainText('ii and vi');
  // and it's remembered
  await page.reload();
  await page.goto('./');
  await expect(page.getByRole('button', { name: /^Guided practice/ })).toContainText('Step 2 of');
});
