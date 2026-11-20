import { describe, expect, it } from 'vitest';
import { APP_NAME } from './version';

describe('scaffold', () => {
  it('has an app name', () => {
    expect(APP_NAME).toBe('Fretboard Chords');
  });
});
