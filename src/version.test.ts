import { describe, expect, it } from 'vitest';
import { APP_NAME, BUILD_TIME, REPO_URL, versionLabel } from './version';

describe('version', () => {
  it('has an app name and repository link', () => {
    expect(APP_NAME).toBe('Fretboard Chords');
    expect(REPO_URL).toBe('https://github.com/shushz/fretboard-chords');
  });
  it('is stamped with the build time', () => {
    expect(Number.isNaN(Date.parse(BUILD_TIME))).toBe(false);
    expect(versionLabel('en-GB')).toMatch(/^Updated \d{1,2} \w{3} \d{4}/);
  });
});
