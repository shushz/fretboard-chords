import type { Page } from '@playwright/test';

/** Save a phone screenshot to docs/screenshots when SCREENSHOTS=1. */
export async function shot(page: Page, name: string): Promise<void> {
  if (!process.env.SCREENSHOTS) return;
  await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: false });
}
