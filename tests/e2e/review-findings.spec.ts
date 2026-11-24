import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { type DayStats, type ItemStats, updateDaily, updateStats } from '../../src/progress/stats';
import { appendLog } from '../../src/progress/log';
import { makeBackup } from '../../src/progress/backup';
import { type Attempt, itemKey } from '../../src/progress/types';
import { DEFAULT_PREFERENCES } from '../../src/prefs/model';

const DAY = 86_400_000;

/** A backup of `days` days of F♯m practice ending today, written for Import JSON. */
function backupFile(days: number, extraStats: Record<string, ItemStats> = {}): string {
  const as: Attempt[] = [];
  const start = Date.now() - (days - 1) * DAY;
  for (let d = 0; d < days; d++)
    for (let i = 0; i < 10; i++)
      as.push({
        item: {
          mode: 'find',
          key: i < 5 ? 'F#m' : 'Bm',
          degree: (i % 2 ? 3 : 0) as 0 | 3,
          quality: 'min',
          stringSet: '1-3',
          inversion: '*',
          anchor: null,
        },
        correct: i % 3 !== 0,
        timeMs: 2500,
        at: start + d * DAY + i * 10_000,
        sevenths: false,
      });
  const stats: Record<string, ItemStats> = { ...extraStats };
  let daily: Record<string, DayStats> = {};
  for (const a of as) {
    const k = itemKey(a.item);
    stats[k] = updateStats(stats[k], a);
    daily = updateDaily(daily, a);
  }
  const file = `test-results/findings-${days}-${Object.keys(extraStats).length}.json`;
  mkdirSync('test-results', { recursive: true });
  writeFileSync(
    file,
    JSON.stringify(makeBackup(DEFAULT_PREFERENCES, stats, daily, Date.now(), appendLog([], as))),
  );
  return file;
}

/** Values in the app's IndexedDB store whose key matches `prefix`. */
async function idbValues(page: Page, prefix: string): Promise<unknown[]> {
  return page.evaluate(
    (pre) =>
      new Promise<unknown[]>((resolve, reject) => {
        const open = indexedDB.open('keyval-store');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const store = open.result.transaction('keyval').objectStore('keyval');
          const keys = store.getAllKeys();
          keys.onsuccess = () => {
            const want = keys.result.filter((k) => String(k).startsWith(pre));
            if (!want.length) return resolve([]);
            const out: unknown[] = [];
            for (const k of want) {
              const r = store.get(k);
              r.onsuccess = () => {
                out.push(r.result);
                if (out.length === want.length) resolve(out);
              };
            }
          };
        };
      }),
    prefix,
  );
}

async function importBackup(page: Page, file: string) {
  await page.goto('./#/stats');
  page.on('dialog', (d) => void d.accept());
  await page.locator('input[type=file]').setInputFiles(file);
  await expect(page.getByText(/^Imported/)).toBeVisible();
}

test('Reset all progress also clears the older-day summaries (All time)', async ({ page }) => {
  await importBackup(page, backupFile(120));
  await expect(page.getByRole('button', { name: 'All time' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset all progress' }).click();
  await expect(page.getByText('All progress reset.')).toBeVisible();
  await page.waitForTimeout(500); // saved
  // the summaries of days older than 60 are gone from storage too
  await expect.poll(async () => JSON.stringify(await idbValues(page, 'rollups'))).toBe('[[]]');
  await page.reload();
  await expect(page.getByText('No practice recorded yet')).toBeVisible();
});

test('Reset one key removes its answers from the charts', async ({ page }) => {
  await importBackup(page, backupFile(20));
  await expect(page.locator('.line-chart')).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Key to reset' }).selectOption('F#m');
  await page.getByRole('button', { name: 'Reset key' }).click();
  await expect(page.getByText(/Progress for F♯m reset/)).toBeVisible();
  await page.waitForTimeout(500); // saved
  const logs = JSON.stringify(await idbValues(page, 'log:'));
  expect(logs).toContain('|Bm|');
  expect(logs).not.toContain('|F#m|');
  await expect(page.locator('.line-chart')).toHaveCount(2); // Bm still charted
});

test('time spent in Preferences does not count toward the answer time', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /^Find the chord/ }).click();
  await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('F#m');
  for (const n of ['iv', 'V', 'ii°', '♭VI', '♭VII']) {
    const b = page
      .getByRole('group', { name: 'Chords' })
      .getByRole('button', { name: n, exact: true });
    if ((await b.getAttribute('aria-pressed')) === 'true') await b.click();
  }
  const two = page.getByRole('group', { name: 'Strings' }).getByRole('button', { name: '2–4' });
  if ((await two.getAttribute('aria-pressed')) === 'true') await two.click();
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.getByRole('button', { name: 'Preferences' }).click();
  await page.waitForTimeout(4000);
  await page.getByRole('button', { name: 'Back' }).click();
  for (const [s, f] of [
    [1, 5],
    [3, 6],
    [2, 7],
  ])
    await page
      .getByRole('button', { name: new RegExp(`^String ${s} fret ${f}\\b`) })
      .dispatchEvent('pointerdown');
  await expect(page.getByRole('status')).toContainText('Correct');
  await page.getByRole('button', { name: 'End session' }).click();
  const median = await page.locator('.big-stats div').nth(2).locator('strong').textContent();
  expect(parseFloat(median!)).toBeLessThan(3); // not 4+ s
});

test('a review item that cannot be asked is skipped, not a blank screen', async ({ page }) => {
  const bad: ItemStats = {
    key: 'find|H#m|0|min|1-3|*|-|',
    attempts: 3,
    correct: 0,
    recent: [{ ok: false, ms: 3000 }],
    firstSeen: 0,
    lastSeen: 0,
    box: 1,
    due: 0,
  };
  await importBackup(page, backupFile(1, { [bad.key]: bad }));
  await page.waitForTimeout(500); // saved
  await page.goto('./');
  await page.getByRole('button', { name: /^Review due items/ }).click();
  // The bad item is skipped; the session carries on to the other items or finishes.
  await expect(page.locator('.prompt-main, .summary').first()).toBeVisible();
});

test('opening the app directly on Practice uses the saved preferences', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Preferences' }).click();
  const sets = page.getByRole('group', { name: 'Triad string sets' });
  await sets.getByRole('button', { name: '3–5' }).click();
  await sets.getByRole('button', { name: '1–3' }).click();
  await sets.getByRole('button', { name: '2–4' }).click();
  await page.waitForTimeout(500); // saved
  await page.goto('./#/practice');
  await page.reload();
  const strings = page.getByRole('group', { name: 'Strings' });
  await expect(strings.getByRole('button', { name: '3–5' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(strings.getByRole('button', { name: '1–3' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('a window starting at fret 1 includes the open-string column in its box', async ({ page }) => {
  await page.goto('./#/explore');
  const box = page.locator('.fb-region');
  const before = (await box.boundingBox())!;
  // window 5–9 → 1–5
  for (let i = 0; i < 4; i++)
    await page
      .getByRole('button', { name: /^Decrease/ })
      .first()
      .click();
  await expect(page.locator('.explore')).toContainText('−1–5+'); // the Frets stepper
  const after = (await box.boundingBox())!;
  const fret1 = (await page
    .getByTestId('note-1-1')
    .or(page.getByRole('button', { name: /^String 1 fret 1\b/ }))
    .first()
    .boundingBox())!;
  expect(after.x).toBeLessThan(fret1.x - 10); // reaches into the open-string column
  expect(before.x).toBeGreaterThan(after.x);
});
