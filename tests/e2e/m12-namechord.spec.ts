import { expect, test } from '@playwright/test';
import { shot } from './helpers';

test('In E♭m, what is iv? → A♭m', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /^Name the chord/ }).click();
  await page.getByRole('radio', { name: 'Degree → chord' }).click();
  await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('Ebm');
  for (const n of ['i', 'V', 'ii°', '♭VI', '♭VII']) {
    await page
      .getByRole('group', { name: 'Chords' })
      .getByRole('button', { name: n, exact: true })
      .click();
  }
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('.prompt-main')).toHaveText('In E♭m, what is iv?');
  // every option is a minor chord: the numeral "iv" already says minor
  const options = await page
    .getByRole('group', { name: 'Answers' })
    .getByRole('button')
    .allTextContents();
  expect(options).toHaveLength(4);
  for (const o of options) expect(o).toMatch(/^[A-G](♯|♭)?m$/);
  await shot(page, 'm12-question');
  await page.getByRole('button', { name: 'A♭m', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('A♭m (A♭–C♭–E♭)');
  await shot(page, 'm12-correct');
});

test('reverse: every numeral matches the chord quality; the tonic is never asked', async ({
  page,
}) => {
  await page.goto('./#/practice');
  await page.getByRole('radio', { name: /^Name the chord/ }).click();
  await page.getByRole('radio', { name: 'Chord → degree' }).click();
  await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('G');
  await page.getByRole('button', { name: /^Start/ }).click();
  for (let i = 0; i < 5; i++) {
    const q = (await page.locator('.prompt-main').textContent())!;
    expect(q).not.toMatch(/^G is which degree/);
    const options = await page
      .getByRole('group', { name: 'Answers' })
      .getByRole('button')
      .allTextContents();
    const shapes = options.map((o) => {
      const m = /^(?:♭|♯)*([IViv]+)(.*)$/u.exec(o)!;
      return `${m[1] === m[1].toUpperCase() ? 'U' : 'l'}${m[2]}`;
    });
    expect(new Set(shapes).size).toBe(1);
    await page.getByRole('group', { name: 'Answers' }).getByRole('button').first().click();
    await page.getByRole('button', { name: 'Next' }).click();
  }
});
