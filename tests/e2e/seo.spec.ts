import { expect, test } from '@playwright/test';

test('page metadata for search engines and link previews', async ({ page, request }) => {
  await page.goto('./');
  await expect(page).toHaveTitle(/^Fretboard Chords: learn guitar chord shapes/);
  const desc = await page.locator('meta[name=description]').getAttribute('content');
  expect(desc!.length).toBeGreaterThan(80);
  expect(desc!.length).toBeLessThanOrEqual(160); // Google cuts snippets around here
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld['@type']).toBe('WebApplication');
  expect(ld.isAccessibleForFree).toBe(true);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
    'href',
    'https://shushz.github.io/fretboard-chords/',
  );
  // the live build is indexable
  await expect(page.locator('meta[name=robots]')).toHaveCount(0);
  // static files served next to the app
  expect((await request.get('./sitemap.xml')).ok()).toBe(true);
  expect((await request.get('./og-image.png')).ok()).toBe(true);
  // the app still renders over the (empty) mount point
  await expect(page.getByRole('button', { name: /^Practice/ })).toBeVisible();
});
