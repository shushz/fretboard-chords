/**
 * Screenshots for README.md. Skipped unless README_SHOTS=1:
 *   README_SHOTS=1 npx playwright test tests/e2e/readme-shots.spec.ts --trace off
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { makeDemoAttempts } from '../../src/progress/demo';
import { type DayStats, type ItemStats, updateDaily, updateStats } from '../../src/progress/stats';
import { appendLog } from '../../src/progress/log';
import { makeBackup } from '../../src/progress/backup';
import { itemKey } from '../../src/progress/types';
import { DEFAULT_PREFERENCES } from '../../src/prefs/model';

const DIR = 'docs/screenshots/readme';

/** A backup file holding the demo history (built with the app's own code). */
function demoBackupFile(): string {
  const attempts = makeDemoAttempts(Date.now());
  const stats: Record<string, ItemStats> = {};
  let daily: Record<string, DayStats> = {};
  for (const a of attempts) {
    const k = itemKey(a.item);
    stats[k] = updateStats(stats[k], a);
    daily = updateDaily(daily, a);
  }
  const file = 'test-results/demo-backup.json';
  mkdirSync('test-results', { recursive: true });
  writeFileSync(
    file,
    JSON.stringify(
      makeBackup(DEFAULT_PREFERENCES, stats, daily, Date.now(), appendLog([], attempts)),
    ),
  );
  return file;
}
test.skip(!process.env.README_SHOTS, 'README screenshots are generated on demand');

async function tap(page: Page, s: number, f: number) {
  await page
    .getByRole('button', { name: new RegExp(`^String ${s} fret ${f}\\b`) })
    .dispatchEvent('pointerdown');
}

async function onlyChords(page: Page, keep: string[]) {
  for (const n of ['i', 'ii°', 'iv', 'V', '♭VI', '♭VII']) {
    const b = page
      .getByRole('group', { name: 'Chords' })
      .getByRole('button', { name: n, exact: true });
    const on = (await b.getAttribute('aria-pressed')) === 'true';
    if (on !== keep.includes(n)) await b.click();
  }
}

async function setup(page: Page, mode: RegExp, keep: string[], strings: '1–3' | '2–4' = '1–3') {
  await page.goto('./');
  await page.getByRole('button', { name: /^Practice/ }).click();
  await page.getByRole('radio', { name: mode }).click();
  await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('F#m');
  await onlyChords(page, keep);
  for (const n of ['1–3', '2–4', '3–5', '4–6']) {
    const b = page.getByRole('group', { name: 'Strings' }).getByRole('button', { name: n });
    if ((await b.count()) === 0) continue;
    const on = (await b.getAttribute('aria-pressed')) === 'true';
    if (on !== (n === strings)) await b.click();
  }
}

test.describe('phone', () => {
  test.use({ viewport: { width: 412, height: 915 }, colorScheme: 'light' });

  test('find, tonic, tones, progress', async ({ page }) => {
    await page.goto('./');
    await page.screenshot({ path: `${DIR}/home.png` });

    // Find the chord — correct answer, roles revealed
    await setup(page, /^Find the chord/, ['i']);
    await page.getByRole('button', { name: /^Start/ }).click();
    await tap(page, 1, 5);
    await tap(page, 3, 6);
    await tap(page, 2, 7);
    await expect(page.getByRole('status')).toContainText('Correct');
    await page.screenshot({ path: `${DIR}/find-the-chord.png` });
    // a couple more answers so the progress screen has data
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Next' }).click();
      if (i === 1) {
        await page.getByRole('button', { name: 'Show answer' }).click();
      } else {
        await tap(page, 1, 5);
        await tap(page, 3, 6);
        await tap(page, 2, 7);
      }
    }
    await page.getByRole('button', { name: 'End session' }).click();

    // From the tonic — smooth answer, given shape faded with key
    await setup(page, /^From the tonic/, ['iv']);
    await page.getByRole('radio', { name: 'Inside the fret window' }).click();
    await page.getByRole('button', { name: /^Start/ }).click();
    await tap(page, 3, 7);
    await tap(page, 2, 7);
    await tap(page, 1, 7);
    await expect(page.getByRole('status')).toContainText('Smooth');
    await page.screenshot({ path: `${DIR}/from-the-tonic.png` });
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'End session' }).click();

    // Name the tones — mid-answer
    await setup(page, /^Name the tones/, ['i']);
    await page.getByRole('radio', { name: 'Label the notes' }).click();
    await page.getByRole('button', { name: /^Start/ }).click();
    await page.getByRole('button', { name: 'Role 5' }).click();
    await page.screenshot({ path: `${DIR}/name-the-tones.png` });
    await page.getByRole('button', { name: 'Role R' }).click();
    await page.getByRole('button', { name: 'Role b3' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'End session' }).click();

    // Progress with a realistic two-week history (the same demo data PR previews use).
    await page.goto('./#/stats');
    page.on('dialog', (d) => void d.accept());
    await page.locator('input[type=file]').setInputFiles(demoBackupFile());
    await expect(page.locator('.line-chart')).toHaveCount(2);
    await page.screenshot({ path: `${DIR}/progress.png` });
    await page.locator('.fn-grid .cell-btn').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${DIR}/progress-map.png` });

    await page.goto('./');
    await page.getByRole('button', { name: /^Help & about/ }).click();
    await page.screenshot({ path: `${DIR}/help.png` });
  });
});

test.describe('phone dark', () => {
  test.use({ viewport: { width: 412, height: 915 }, colorScheme: 'dark' });

  test('explorer sevenths, quality switch', async ({ page }) => {
    await page.goto('./#/explore');
    await page.getByRole('radio', { name: 'Sevenths' }).click();
    await page.getByRole('button', { name: 'V7', exact: true }).click();
    await page.screenshot({ path: `${DIR}/chord-explorer-dark.png` });

    await page.goto('./');
    await page.getByRole('button', { name: /^Practice/ }).click();
    await page.getByRole('radio', { name: /^Quality switch/ }).click();
    await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('D');
    for (const n of ['IV', 'V', 'ii', 'vi']) {
      await page
        .getByRole('group', { name: 'Chords' })
        .getByRole('button', { name: n, exact: true })
        .click();
    }
    await page.getByRole('group', { name: 'Strings' }).getByRole('button', { name: '2–4' }).click();
    await page.getByRole('button', { name: /^Start/ }).click();
    await tap(page, 2, 7);
    await tap(page, 2, 6);
    await expect(page.getByRole('status')).toContainText('Correct');
    await page.screenshot({ path: `${DIR}/quality-switch-dark.png` });
  });
});

test.describe('landscape', () => {
  test.use({ viewport: { width: 915, height: 412 }, colorScheme: 'light' });

  test('progression walk', async ({ page }) => {
    await page.goto('./#/practice');
    await page.getByRole('radio', { name: /^Progression walk/ }).click();
    await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('F#m');
    await page.getByRole('combobox', { name: 'Progression' }).selectOption('i-iv-V-i');
    await page.getByRole('group', { name: 'Strings' }).getByRole('button', { name: '2–4' }).click();
    await page.getByRole('button', { name: /^Start/ }).click();
    await tap(page, 1, 5);
    await tap(page, 3, 6);
    await tap(page, 2, 7);
    await expect(page.locator('.prompt-main')).toHaveText('F♯m · iv');
    await tap(page, 3, 7);
    await tap(page, 2, 7);
    await tap(page, 1, 7);
    await expect(page.getByRole('status')).toContainText('Smooth');
    await page.screenshot({ path: `${DIR}/progression-walk-landscape.png` });
  });
});
