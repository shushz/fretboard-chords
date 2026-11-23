import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { type DayStats, type ItemStats, updateDaily, updateStats } from '../../src/progress/stats';
import { appendLog } from '../../src/progress/log';
import { makeBackup } from '../../src/progress/backup';
import { type Attempt, itemKey } from '../../src/progress/types';
import { DEFAULT_PREFERENCES } from '../../src/prefs/model';

const DAY = 86_400_000;

/** `days` days of practice ending today, getting better over time. */
function attempts(days: number): Attempt[] {
  const out: Attempt[] = [];
  const start = Date.now() - (days - 1) * DAY;
  for (let d = 0; d < days; d++)
    for (let i = 0; i < 20; i++)
      out.push({
        item: {
          mode: 'fromTonic',
          key: 'F#m',
          degree: (1 + (i % 4)) as 1 | 2 | 3 | 4,
          quality: 'min',
          stringSet: '2-4',
          inversion: 'root',
          anchor: null,
        },
        correct: i < 8 + (d * 10) / days,
        timeMs: 5000 - (d * 2500) / days + i * 30,
        at: start + d * DAY + i * 10_000,
        sevenths: false,
      });
  return out;
}

function backupFile(days: number): string {
  const as = attempts(days);
  const stats: Record<string, ItemStats> = {};
  let daily: Record<string, DayStats> = {};
  for (const a of as) {
    const k = itemKey(a.item);
    stats[k] = updateStats(stats[k], a);
    daily = updateDaily(daily, a);
  }
  const file = `test-results/history-${days}.json`;
  mkdirSync('test-results', { recursive: true });
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
}

/** Keys in the app's IndexedDB store (idb-keyval's default database). */
async function idbKeys(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve, reject) => {
        const open = indexedDB.open('keyval-store');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction('keyval').objectStore('keyval').getAllKeys();
          req.onsuccess = () => resolve(req.result.map(String));
          req.onerror = () => reject(req.error);
        };
      }),
  );
}

test('a long history is summarized, survives a reload and shows All time by week', async ({
  page,
}) => {
  await importBackup(page, backupFile(120));
  await expect(page.getByRole('button', { name: 'All time' })).toBeVisible();
  // saved: per-day keys for the recent days, summaries for the rest, no old single log
  await expect
    .poll(async () => (await idbKeys(page)).filter((k) => k.startsWith('log:')).length)
    .toBe(60);
  const keys = await idbKeys(page);
  expect(keys).toContain('rollups');
  expect(keys).toContain('logDays');
  expect(keys).not.toContain('log');

  await page.reload();
  await page.getByRole('button', { name: 'All time' }).click();
  await expect(page.locator('.trend-summary')).toContainText('compared with your first 4 weeks');
  await expect(page.locator('.chart-readout')).toHaveText('Tap a point to see that week.');
  await page.getByRole('button', { name: 'Last 30 days' }).click();
  await expect(page.locator('.trend-summary')).toContainText('practice days');
});

test('the old single-array log is migrated to per-day storage', async ({ page }) => {
  await page.goto('./');
  const log = attempts(3).map((a) => ({
    t: a.at,
    k: itemKey(a.item),
    ok: a.correct ? 1 : 0,
    ms: a.timeMs,
  }));
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('keyval-store');
        open.onupgradeneeded = () => open.result.createObjectStore('keyval');
        open.onsuccess = () => {
          const tx = open.result.transaction('keyval', 'readwrite');
          tx.objectStore('keyval').put(value, 'log');
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    log,
  );
  await page.goto('./#/stats');
  await page.reload();
  await expect
    .poll(async () => (await idbKeys(page)).filter((k) => k.startsWith('log:')).length)
    .toBe(3);
  expect(await idbKeys(page)).not.toContain('log');
});

test('backup reminder after a few weeks without a backup; Export clears it', async ({ page }) => {
  await importBackup(page, backupFile(20));
  const reminder = page.locator('.backup-reminder');
  await expect(reminder).toContainText('Last backup: never');
  const download = page.waitForEvent('download');
  await reminder.getByRole('button', { name: 'Export' }).click();
  await download;
  await expect(reminder).toHaveCount(0);
  await expect(page.getByText('Last backup: today.')).toBeVisible();
  await page.reload();
  await expect(page.locator('.backup-reminder')).toHaveCount(0);
});

test('no reminder with less than two weeks of practice', async ({ page }) => {
  await importBackup(page, backupFile(5));
  await expect(page.locator('.backup-reminder')).toHaveCount(0);
});
