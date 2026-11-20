import { expect, test, type Page } from '@playwright/test';
import { shot } from './helpers';

async function startFind(page: Page) {
  await page.goto('./#/practice');
  await page.getByRole('combobox', { name: 'Key', exact: true }).selectOption('F#m');
  await page.getByRole('button', { name: /^Start/ }).click();
}

async function box(page: Page, selector: string) {
  return (await page.locator(selector).first().boundingBox())!;
}

test('portrait: fret numbers below the board', async ({ page }) => {
  await startFind(page);
  await expect(page.locator('.fb-fretnum').first()).toBeVisible();
  await shot(page, 'layout-portrait');
});

test.describe('landscape phone', () => {
  test.use({ viewport: { width: 915, height: 412 } });

  test('question, board and buttons all fit on screen side by side', async ({ page }) => {
    await startFind(page);
    const prompt = await box(page, '.prompt-main');
    const board = await box(page, '.fretboard');
    const actions = await box(page, '.actions');
    for (const b of [prompt, board, actions]) {
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y + b.height).toBeLessThanOrEqual(412);
    }
    expect(prompt.x).toBeGreaterThan(board.x + board.width - 1); // prompt to the right of the board
    // touch targets stay ≥ 44 px
    const cell = await page.getByRole('button', { name: /^String 1 fret 7\b/ }).boundingBox();
    expect(cell!.height).toBeGreaterThanOrEqual(44);
    expect(cell!.width).toBeGreaterThanOrEqual(44);
    await shot(page, 'layout-landscape');
    await page.getByRole('button', { name: 'Show answer' }).click();
    const fb = await box(page, '.feedback');
    expect(fb.y + fb.height).toBeLessThanOrEqual(412);
    expect(fb.x).toBeGreaterThan(board.x + board.width - 1);
    await shot(page, 'layout-landscape-feedback');
  });

  test('explorer uses the side column too', async ({ page }) => {
    await page.goto('./#/explore');
    const board = await box(page, '.fretboard');
    const prompt = await box(page, '.prompt-main');
    expect(prompt.x).toBeGreaterThan(board.x + board.width - 1);
    expect(board.y + board.height).toBeLessThanOrEqual(412);
    await shot(page, 'layout-landscape-explore');
  });
});
