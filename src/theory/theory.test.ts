import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SPELLING,
  type DegreeIndex,
  type Key,
  type SpellingOptions,
  buildChord,
  chordNumeral,
  chordSpelling,
  chordSymbol,
  diatonicChord,
  diatonicChords,
  findDegree,
  formatKey,
  formatNote,
  formatRole,
  isTheoretical,
  key,
  keyToAscii,
  keysForMode,
  normalizeKey,
  note,
  noteToAscii,
  parseKeyName,
  parseNote,
  pitchClass,
  relativeKey,
  resolveKey,
  roleOfNote,
  scale,
  selectableKeys,
  signature,
  spellAbove,
} from './index';

const k = (s: string): Key => {
  const r = parseKeyName(s);
  if (!r) throw new Error(`bad key ${s}`);
  return r;
};
const spell = (keyName: string, d: DegreeIndex, sevenths = false) =>
  chordSpelling(diatonicChord(k(keyName), d, sevenths));
const rootOf = (keyName: string, d: DegreeIndex) => noteToAscii(diatonicChord(k(keyName), d).root);

describe('notes', () => {
  it('parses and spells', () => {
    expect(parseNote('F#')).toEqual(note('F', 1));
    expect(parseNote('Fx')).toEqual(note('F', 2));
    expect(parseNote('F##')).toEqual(note('F', 2));
    expect(parseNote('Bbb')).toEqual(note('B', -2));
    expect(parseNote('E♭')).toEqual(note('E', -1));
    expect(parseNote('bE')).toEqual(note('E', -1));
    expect(parseNote('bb')).toEqual(note('B', -1));
    expect(parseNote('H')).toBeNull();
  });
  it('derives pitch classes from spelling', () => {
    expect(pitchClass(note('B', 1))).toBe(0);
    expect(pitchClass(note('C', -1))).toBe(11);
    expect(pitchClass(note('F', 2))).toBe(7);
  });
  it('formats glyphs and ascii', () => {
    expect(formatNote(note('F', 2))).toBe('F𝄪');
    expect(formatNote(note('B', -2))).toBe('B𝄫');
    expect(formatNote(note('E', -1), false)).toBe('Eb');
  });
  it('spells intervals by letter', () => {
    expect(noteToAscii(spellAbove(note('G', 1), 2, 4))).toBe('B#');
    expect(noteToAscii(spellAbove(note('D', 1), 2, 4))).toBe('F##');
    expect(() => spellAbove(note('B', 2), 2, 3)).not.toThrow();
  });
});

describe('§3.5 fixtures', () => {
  it('F#m', () => {
    expect(spell('F#m', 0)).toBe('F#-A-C#');
    expect(spell('F#m', 1)).toBe('G#-B-D');
    expect(rootOf('F#m', 2)).toBe('A');
    expect(spell('F#m', 2)).toBe('A-C#-E');
    expect(spell('F#m', 3)).toBe('B-D-F#');
    expect(spell('F#m', 4)).toBe('C#-E#-G#');
    expect(rootOf('F#m', 5)).toBe('D');
    expect(rootOf('F#m', 6)).toBe('E');
  });
  it('E♭m', () => {
    expect(spell('Ebm', 0)).toBe('Eb-Gb-Bb');
    expect(spell('Ebm', 1)).toBe('F-Ab-Cb');
    expect(rootOf('Ebm', 2)).toBe('Gb');
    expect(spell('Ebm', 3)).toBe('Ab-Cb-Eb');
    expect(spell('Ebm', 4)).toBe('Bb-D-F');
    expect(spell('Ebm', 5)).toBe('Cb-Eb-Gb');
    expect(rootOf('Ebm', 6)).toBe('Db');
  });
  it('G#m V = D#–F##–A#', () => {
    expect(spell('G#m', 4)).toBe('D#-F##-A#');
  });
  it('C major V7 and viiø7', () => {
    expect(spell('C', 4, true)).toBe('G-B-D-F');
    expect(spell('C', 6, true)).toBe('B-D-F-A');
    expect(diatonicChord(k('C'), 6, true).quality).toBe('m7b5');
  });
});

describe('diatonic qualities', () => {
  it('major key triads and sevenths', () => {
    expect(diatonicChords(k('C')).map((c) => c.quality)).toEqual([
      'maj',
      'min',
      'min',
      'maj',
      'maj',
      'min',
      'dim',
    ]);
    expect(diatonicChords(k('C'), true).map((c) => c.quality)).toEqual([
      'maj7',
      'm7',
      'm7',
      'maj7',
      '7',
      'm7',
      'm7b5',
    ]);
  });
  it('minor key, harmonic V by default', () => {
    expect(diatonicChords(k('Am')).map((c) => c.quality)).toEqual([
      'min',
      'dim',
      'maj',
      'min',
      'maj',
      'maj',
      'maj',
    ]);
    expect(diatonicChords(k('Am'), true).map((c) => c.quality)).toEqual([
      'm7',
      'm7b5',
      'maj7',
      'm7',
      '7',
      'maj7',
      '7',
    ]);
    // bVII stays natural (G, not G#)
    expect(spell('Am', 6)).toBe('G-B-D');
  });
  it('natural minor v is a preference', () => {
    const c = diatonicChord(k('Am'), 4, false, { minorV: 'natural' });
    expect(chordSpelling(c)).toBe('E-G-B');
    expect(diatonicChord(k('Am'), 4, true, { minorV: 'natural' }).quality).toBe('m7');
  });
  it('every standard key spells without error and stacks letters', () => {
    for (const kk of selectableKeys({ ...DEFAULT_SPELLING, allowTheoretical: true })) {
      for (const c of diatonicChords(kk, true)) {
        const letters = c.tones.map((t) => t.note.letter);
        expect(new Set(letters).size).toBe(4);
      }
    }
  });
});

describe('roman numerals', () => {
  it('major and minor numerals', () => {
    expect(diatonicChords(k('C')).map((c) => chordNumeral(c))).toEqual([
      'I',
      'ii',
      'iii',
      'IV',
      'V',
      'vi',
      'vii°',
    ]);
    expect(
      diatonicChords(k('F#m')).map((c) => chordNumeral(c, { dimStyle: 'symbol', glyphs: false })),
    ).toEqual(['i', 'ii°', 'bIII', 'iv', 'V', 'bVI', 'bVII']);
    expect(chordNumeral(diatonicChord(k('Am'), 4, false, { minorV: 'natural' }))).toBe('v');
    expect(chordNumeral(diatonicChord(k('C'), 6, true))).toBe('viiø7');
    expect(chordNumeral(diatonicChord(k('C'), 6, true), { dimStyle: 'text', glyphs: false })).toBe(
      'vii7b5',
    );
    expect(chordNumeral(diatonicChord(k('Ebm'), 5), { dimStyle: 'symbol', glyphs: true })).toBe(
      '♭VI',
    );
  });
});

describe('chord symbols and roles', () => {
  it('symbols', () => {
    expect(chordSymbol(diatonicChord(k('Ebm'), 3))).toBe('A♭m');
    expect(chordSymbol(diatonicChord(k('F#m'), 1))).toBe('G♯°');
    expect(chordSymbol(diatonicChord(k('F#m'), 1), { glyphs: false, dimStyle: 'text' })).toBe(
      'G#dim',
    );
    expect(chordSymbol(buildChord(note('B'), 'm7b5'))).toBe('Bø7');
  });
  it('roles', () => {
    const c = diatonicChord(k('F#m'), 0);
    expect(roleOfNote(c, note('A'))).toBe('b3');
    expect(roleOfNote(c, note('C', 1))).toBe('5');
    expect(roleOfNote(c, note('D', -1))).toBeNull(); // enharmonic, wrong spelling
    expect(diatonicChord(k('C'), 4, true).tones.map((t) => t.role)).toEqual(['R', '3', '5', 'b7']);
    expect(buildChord(note('C'), 'dim7').tones.map((t) => t.role)).toEqual([
      'R',
      'b3',
      'b5',
      'bb7',
    ]);
    expect(formatRole('b3', 'glyph')).toBe('♭3');
    expect(formatRole('b3', 'interval')).toBe('m3');
  });
  it('findDegree', () => {
    expect(findDegree(k('Ebm'), buildChord(note('A', -1), 'min'))).toBe(3);
    expect(findDegree(k('Ebm'), buildChord(note('G', 1), 'min'))).toBeNull();
  });
});

describe('keys and spelling preferences', () => {
  const opts = DEFAULT_SPELLING;
  it('signatures and theoretical keys', () => {
    expect(signature(k('F#m'))).toBe(3);
    expect(signature(k('Ebm'))).toBe(-6);
    expect(isTheoretical(k('Gbm'))).toBe(true);
    expect(isTheoretical(k('D#'))).toBe(true);
    expect(isTheoretical(k('A#m'))).toBe(false);
  });
  it('theoretical G♭m is spelled with double flats', () => {
    expect(scale(k('Gbm')).map(noteToAscii)).toEqual(['Gb', 'Ab', 'Bbb', 'Cb', 'Db', 'Ebb', 'Fb']);
  });
  it('normalizes input aliases', () => {
    const n = (s: string, o: SpellingOptions = opts) => {
      const r = normalizeKey(s, o);
      return r ? keyToAscii(r.key) : null;
    };
    expect(n('Gbm')).toBe('F#m');
    expect(normalizeKey('Gbm', opts)?.theoreticalMapped).toBe(true);
    expect(n('bEm')).toBe('Ebm');
    expect(n('Ebm')).toBe('Ebm');
    expect(n('D#m')).toBe('Ebm');
    expect(n('A#m')).toBe('Bbm');
    expect(n('Abm')).toBe('G#m');
    expect(n('C#')).toBe('Db');
    expect(n('F# major')).toBe('Gb');
    expect(n('f# minor')).toBe('F#m');
    expect(n('B')).toBe('B');
    expect(n('Cb')).toBe('B');
    expect(n('E#m')).toBe('Fm');
    expect(n('Gbm', { ...opts, allowTheoretical: true })).toBe('Gbm');
    expect(n('A#m', { ...opts, pairs: { ...opts.pairs, 'Bbm/A#m': 'sharp' } })).toBe('A#m');
    expect(n('C#', { ...opts, prefer: 'sharp', pairs: { ...opts.pairs, 'Db/C#': 'auto' } })).toBe(
      'C#',
    );
    expect(n('nonsense')).toBeNull();
  });
  it('lists 12 keys per mode following preferences', () => {
    const maj = keysForMode('major', opts).map(keyToAscii);
    expect(maj).toEqual(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']);
    const min = keysForMode('minor', opts).map(keyToAscii);
    expect(min).toEqual([
      'Cm',
      'C#m',
      'Dm',
      'Ebm',
      'Em',
      'Fm',
      'F#m',
      'Gm',
      'G#m',
      'Am',
      'Bbm',
      'Bm',
    ]);
    expect(selectableKeys(opts)).toHaveLength(24);
  });
  it('resolveKey keeps unpaired keys', () => {
    expect(resolveKey(key(note('F', 1), 'minor'), opts).mappedFrom).toBeUndefined();
  });
  it('relative keys and formatting', () => {
    expect(keyToAscii(relativeKey(k('F#m')))).toBe('A');
    expect(keyToAscii(relativeKey(k('Eb')))).toBe('Cm');
    expect(formatKey(k('Ebm'))).toBe('E♭m');
    expect(formatKey(k('Ebm'), true, true)).toBe('E♭ minor');
  });
});
