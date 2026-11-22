/**
 * Build environment. PR previews are built with PREVIEW_PR=<number> (see
 * .github/workflows/preview.yml); the live app has none.
 */
declare const __PREVIEW_PR__: string;

export const PREVIEW_PR: number | null =
  typeof __PREVIEW_PR__ === 'string' && /^\d+$/.test(__PREVIEW_PR__)
    ? Number(__PREVIEW_PR__)
    : null;

export const IS_PREVIEW = PREVIEW_PR !== null;

/**
 * Storage names. The live app keeps idb-keyval's default database (existing users' data
 * stays where it is); each preview gets its own database and localStorage prefix, since
 * previews share the origin (shushz.github.io) with the live app.
 */
export function storageNames(pr: number | null): { db: string | null; local: string } {
  return pr === null
    ? { db: null, local: 'fretboard-chords:' }
    : { db: `fretboard-chords-pr-${pr}`, local: `fretboard-chords-pr-${pr}:` };
}
