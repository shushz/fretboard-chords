// Renders public/icon.svg to PNG icons with the pre-installed Chromium (dev-time only).
// Usage: node scripts/make-icons.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const svg = readFileSync('public/icon.svg', 'utf8');
const targets = [
  { file: 'public/pwa-192.png', size: 192, pad: 0 },
  { file: 'public/pwa-512.png', size: 512, pad: 0 },
  { file: 'public/pwa-maskable-512.png', size: 512, pad: 0.12 },
  { file: 'public/apple-touch-icon.png', size: 180, pad: 0 },
  { file: 'public/favicon-32.png', size: 32, pad: 0 },
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  const inner = Math.round(t.size * (1 - 2 * t.pad));
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><body style="margin:0;background:#1d2430;display:grid;place-items:center;width:${t.size}px;height:${t.size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`,
  );
  await page.screenshot({ path: t.file, omitBackground: false });
}
await browser.close();
