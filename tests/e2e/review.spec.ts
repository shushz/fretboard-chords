import { expect, test, type Page } from '@playwright/test';
import { DEFAULT_PREFERENCES } from '../../src/prefs/model';
import { parseKeyName } from '../../src/theory/keys';
import { type DegreeIndex, diatonicChord } from '../../src/theory/chords';
import { voicingsInRegion } from '../../src/fretboard/voicings';
import type { StringSetId } from '../../src/fretboard/regions';
import { voicingOptions } from '../../src/exercises/config';

const P = DEFAULT_PREFERENCES;
const DEGREE: Record<string, DegreeIndex> = { i: 0, iv: 3, V: 4 };

async function tap(page: Page, s: number, f: number) {
  await page
    .getByRole('button', { name: new RegExp(`^String ${s} fret ${f}\\b`) })
    .dispatchEvent('pointerdown');
}

/**
 * Answer a Find the chord question in a minor key correctly, using the app's own theory
 * code. Reviews ask in a random key of the item's mode, so the key is read off the prompt.
 */
async function answerFind(page: Page) {
  const main = (await page.locator('.prompt-main').textContent())!; // "Am · iv"
  const sub = (await page.locator('.prompt-sub').textContent())!; // "strings 2–4 · frets 5–9"
  const m = /strings (\d)–(\d) · frets (\d+)–(\d+)/.exec(sub)!;
  const [keyName, numeral] = main.split(' · ');
  const key = parseKeyName(keyName.replace('♯', '#').replace('♭', 'b'))!;
  const chord = diatonicChord(key, DEGREE[numeral], false, P.harmony);
  const region = {
    stringSet: `${m[1]}-${m[2]}` as StringSetId,
    window: { start: +m[3], width: +m[4] - +m[3] + 1 },
  };
  const v = voicingsInRegion(chord, region, voicingOptions(P))[0];
  for (const n of v.notes) await tap(page, n.string, n.fret);
  await expect(page.getByRole('status')).toContainText('Correct');
}

test('a perfect review clears every due item, progression steps included', async ({ page }) => {
  // Progression walk i–iv–V–i in F♯m on strings 2–4, every chord revealed: three items due.
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /Progression walk/ }).click();
  await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('F#m');
  await page.getByLabel('Progression').selectOption('i-iv-V-i');
  const strings = page.getByRole('group', { name: 'Strings' });
  if ((await strings.getByRole('button', { name: '1–3' }).getAttribute('aria-pressed')) === 'true')
    await strings.getByRole('button', { name: '1–3' }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  for (const next of ['Next chord', 'Next chord', 'Next chord', 'Finish']) {
    await page.getByRole('button', { name: 'Show answer' }).click();
    await page.getByRole('button', { name: next }).click();
  }
  await page.getByRole('button', { name: 'End session' }).click();
  await page.waitForTimeout(400);

  await page.goto('./');
  await page.getByRole('button', { name: /Review due items 3 for today/ }).click();
  for (let i = 0; i < 3; i++) {
    await answerFind(page);
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await expect(page.getByText('Session complete')).toBeVisible();
  await expect(page.locator('.summary .big-stats')).toContainText('3/3');
  await page.waitForTimeout(400);

  await page.goto('./');
  await expect(page.getByRole('button', { name: /Review due items/ })).toHaveCount(0);
  // and it stays that way after a reload (saved)
  await page.reload();
  await expect(page.getByRole('button', { name: /Practice/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Review due items/ })).toHaveCount(0);
});
