import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  anchorStringList,
  mergePreferences,
  numeralOptions,
  symbolOptions,
  updatePreferences,
} from './model';

describe('preferences model', () => {
  it('defaults follow the spec', () => {
    const p = DEFAULT_PREFERENCES;
    expect(p.spelling.pairs['Db/C#']).toBe('flat');
    expect(p.spelling.pairs['Abm/G#m']).toBe('sharp');
    expect(p.spelling.pairs['Cb/B']).toBe('sharp');
    expect(p.spelling.allowTheoretical).toBe(false);
    expect(p.harmony.minorV).toBe('harmonic');
    expect(p.fretboard.stringSets).toEqual(['1-3', '2-4']);
    expect(p.fretboard.anchor).toBe('ghost');
    expect(p.fretboard.window).toEqual({ start: 5, width: 5 });
    expect(p.fretboard.maxSpan).toBe(4);
    expect(p.practice.masteryAccuracy).toBe(0.9);
  });
  it('merges partial stored data onto defaults', () => {
    const p = mergePreferences({ sound: { muted: true }, fretboard: { leftHanded: true } });
    expect(p.sound.muted).toBe(true);
    expect(p.sound.volume).toBe(0.8);
    expect(p.fretboard.leftHanded).toBe(true);
    expect(p.fretboard.stringSets).toEqual(['1-3', '2-4']);
  });
  it('drops wrong types and unknown keys', () => {
    const p = mergePreferences({
      sound: { volume: 'loud' },
      bogus: 1,
      fretboard: { stringSets: ['1-3', 5, '3-5'] },
      practice: { sessionLength: { kind: 'minutes', minutes: 5 } },
    });
    expect(p.sound.volume).toBe(0.8);
    expect('bogus' in p).toBe(false);
    expect(p.fretboard.stringSets).toEqual(['1-3', '3-5']);
    expect(p.practice.sessionLength).toEqual({ kind: 'minutes', minutes: 5 });
    expect(mergePreferences('garbage')).toEqual(DEFAULT_PREFERENCES);
    expect(
      mergePreferences({ practice: { sessionLength: { kind: 'x' } } }).practice.sessionLength,
    ).toEqual(DEFAULT_PREFERENCES.practice.sessionLength);
  });
  it('old notation settings are dropped; the given-shape hint defaults to on', () => {
    const p = mergePreferences({
      spelling: { glyphs: false, prefer: 'sharp' },
      harmony: { dimStyle: 'text', roleLabels: 'interval', minorV: 'natural' },
    });
    expect('glyphs' in p.spelling).toBe(false);
    expect(p.harmony).toEqual({ minorV: 'natural' });
    expect(p.spelling.prefer).toBe('sharp');
    expect(p.practice.givenShapeRoles).toBe(true);
    expect(symbolOptions(p)).toEqual({ glyphs: true, dimStyle: 'symbol' });
    expect(numeralOptions(p)).toEqual({ glyphs: true, dimStyle: 'symbol' });
  });
  it('update is immutable', () => {
    const p = updatePreferences(DEFAULT_PREFERENCES, (d) => {
      d.fretboard.anchorStrings = '5';
    });
    expect(DEFAULT_PREFERENCES.fretboard.anchorStrings).toBe('both');
    expect(anchorStringList(p)).toEqual([5]);
    expect(anchorStringList(DEFAULT_PREFERENCES)).toEqual([6, 5]);
  });
});
