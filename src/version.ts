export const APP_NAME = 'Fretboard Chords';

/** Stamped at build time (vite.config.ts `define`). */
export const BUILD_TIME: string = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : '';
export const BUILD_COMMIT: string = typeof __BUILD_COMMIT__ === 'string' ? __BUILD_COMMIT__ : '';

export const REPO_URL = 'https://github.com/shushz/fretboard-chords';
export const ISSUES_URL = `${REPO_URL}/issues/new`;

/** "Updated 22 Nov 2026, 14:05 · abc1234", in the viewer's locale and time zone. */
export function versionLabel(locale?: string): string {
  if (!BUILD_TIME) return 'Development build';
  const d = new Date(BUILD_TIME);
  const when = d.toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `Updated ${when}${BUILD_COMMIT ? ` · ${BUILD_COMMIT}` : ''}`;
}
