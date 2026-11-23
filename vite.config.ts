/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

/** Version shown in the app: build time + short commit (when built from git). */
function commit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

/**
 * The live app is served at /fretboard-chords/. PR previews are built with
 * BASE_PATH=/fretboard-chords/pr-preview/pr-<n>/ and PREVIEW_PR=<n> (preview.yml): they
 * get their own storage and demo data, and no service worker.
 */
const base = process.env.BASE_PATH || '/fretboard-chords/';
const previewPr = process.env.PREVIEW_PR || '';

export default defineConfig({
  base,
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_COMMIT__: JSON.stringify(commit()),
    __PREVIEW_PR__: JSON.stringify(previewPr),
  },
  plugins: [
    preact(),
    {
      // PR previews must never show up in search results (the canonical link already points
      // at the live app; this makes it explicit).
      name: 'preview-noindex',
      transformIndexHtml: (html) =>
        previewPr
          ? html.replace('<head>', '<head>\n    <meta name="robots" content="noindex" />')
          : html,
    },
    VitePWA({
      // Previews are for trying things out: no offline install, no cache to go stale.
      disable: previewPr !== '',
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icon.svg', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Fretboard Chords',
        short_name: 'Fretboard',
        description:
          'Drill diatonic chord shapes, chord-tone roles and chord relationships on the guitar neck. Works offline.',
        theme_color: '#1d2430',
        background_color: '#1d2430',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // For crawlers and link previews only, not the app: Search Console's ownership file
        // and the link-preview image.
        globIgnores: ['**/google*.html', '**/og-image.png'],
        navigateFallback: `${base}index.html`,
        // Previews live under the live app's path: never answer them with the live app.
        navigateFallbackDenylist: [/\/pr-preview\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
