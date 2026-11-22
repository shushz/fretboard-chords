import { describe, expect, it } from 'vitest';
import { IS_PREVIEW, PREVIEW_PR, storageNames } from './env';

describe('build environment', () => {
  it('the live app keeps the existing storage; previews get their own', () => {
    expect(storageNames(null)).toEqual({ db: null, local: 'fretboard-chords:' });
    expect(storageNames(29)).toEqual({
      db: 'fretboard-chords-pr-29',
      local: 'fretboard-chords-pr-29:',
    });
  });
  it('tests run as the live app', () => {
    expect(PREVIEW_PR).toBeNull();
    expect(IS_PREVIEW).toBe(false);
  });
});
