import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../../prefs/model';
import { type Key, keyToAscii, parseKeyName, scale, selectableKeys } from '../../theory/keys';
import { note, noteToAscii, parseNote, pitchClass } from '../../theory/notes';
import { CORE_DEGREES, DEGREES } from '../../theory/chords';
import { defaultConfig } from '../config';
import {
  askableDegrees,
  enharmonic,
  forwardRootCandidates,
  generateNameChordQuestion,
  nameChordItem,
} from './logic';
import { diatonicChord } from '../../theory/chords';

const p = DEFAULT_PREFERENCES;
const sym = { glyphs: true, dimStyle: 'symbol' as const };
const num = { glyphs: true, dimStyle: 'symbol' as const };
function seeded(seed = 23) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}
const opts = (rand = seeded()) => ({ harmony: p.harmony, symbol: sym, numeral: num, rand });

/** "A♭m7" → root A♭, suffix "m7". */
function splitSymbol(s: string) {
  const m = /^([A-G](?:𝄪|𝄫|♯|♭)?)(.*)$/u.exec(s)!;
  return { root: parseNote(m[1])!, suffix: m[2] };
}
/** "♭VImaj7" → { upper: true, suffix: "maj7" } — what a numeral says about quality. */
function numeralShape(s: string) {
  const m = /^(?:♭|♯)*([IViv]+)(.*)$/u.exec(s)!;
  return { upper: m[1] === m[1].toUpperCase(), suffix: m[2] };
}

describe('mode 6: name the chord', () => {
  it('enharmonic spellings', () => {
    expect(noteToAscii(enharmonic(note('A', -1))!)).toBe('G#');
    expect(noteToAscii(enharmonic(note('C', 1))!)).toBe('Db');
    expect(noteToAscii(enharmonic(note('C', -1))!)).toBe('B');
    expect(enharmonic(note('D'))).toBeNull();
  });

  it('never asks about the tonic (always the key name)', () => {
    const cfg = defaultConfig('nameChord', parseKeyName('G')!, p);
    expect(askableDegrees(cfg)).not.toContain(0);
    expect(askableDegrees({ ...cfg, degrees: [0] })).toEqual(
      CORE_DEGREES.major.filter((d) => d !== 0),
    );
    const rand = seeded(2);
    for (let i = 0; i < 50; i++) {
      expect(
        generateNameChordQuestion({ ...cfg, degrees: [...DEGREES] }, opts(rand))!.chord.degree,
      ).not.toBe(0);
    }
  });

  it('"In E♭m, what is iv?" — every option is a minor chord', () => {
    const cfg = {
      ...defaultConfig('nameChord', parseKeyName('Ebm')!, p),
      degrees: [3 as const],
      variant: 'forward',
    };
    const rand = seeded();
    for (let i = 0; i < 20; i++) {
      const q = generateNameChordQuestion(cfg, opts(rand))!;
      expect(q.answer).toBe('A♭m');
      expect(q.options).toHaveLength(4);
      for (const o of q.options) expect(splitSymbol(o).suffix).toBe('m');
    }
    const roots = forwardRootCandidates(diatonicChord(parseKeyName('Ebm')!, 3)).map((x) =>
      noteToAscii(x.root),
    );
    expect(roots).toContain('A'); // wrong accidental
    expect(roots).toContain('G#'); // misspelling
    expect(roots).toContain('Gb'); // neighbouring degree
  });

  it('"ii° in Am": every option is diminished', () => {
    const cfg = {
      ...defaultConfig('nameChord', parseKeyName('Am')!, p),
      degrees: [1 as const],
      variant: 'forward',
    };
    const q = generateNameChordQuestion(cfg, opts())!;
    expect(q.answer).toBe('B°');
    for (const o of q.options) expect(o.endsWith('°')).toBe(true);
  });

  it('"A♭m is which degree in E♭m?" — every option is a minor numeral', () => {
    const cfg = {
      ...defaultConfig('nameChord', parseKeyName('Ebm')!, p),
      degrees: [3 as const],
      variant: 'reverse',
    };
    const rand = seeded(4);
    for (let i = 0; i < 20; i++) {
      const q = generateNameChordQuestion(cfg, opts(rand))!;
      expect(q.answer).toBe('iv');
      expect(q.options).not.toContain('IV');
      for (const o of q.options) expect(numeralShape(o)).toEqual({ upper: false, suffix: '' });
      expect(nameChordItem(q).variant).toBe('reverse');
    }
  });

  const keys: Key[] = selectableKeys(p.spelling);
  for (const sevenths of [false, true]) {
    it(`every key and degree (${sevenths ? 'sevenths' : 'triads'}): no option can be ruled out by its quality`, () => {
      const rand = seeded(sevenths ? 7 : 3);
      for (const k of keys) {
        const doubles = scale(k).some((n) => Math.abs(n.acc) === 2);
        for (const d of DEGREES.filter((x) => x !== 0)) {
          for (const variant of ['forward', 'reverse']) {
            const cfg = { ...defaultConfig('nameChord', k, p), degrees: [d], sevenths, variant };
            for (let i = 0; i < 4; i++) {
              const q = generateNameChordQuestion(cfg, opts(rand))!;
              const where = `${keyToAscii(k)} ${d} ${variant}: ${q.options.join(' ')}`;
              expect(q.options, where).toHaveLength(4);
              expect(new Set(q.options).size, where).toBe(4);
              expect(q.options, where).toContain(q.answer);
              if (variant === 'forward') {
                const a = splitSymbol(q.answer);
                const parsed = q.options.map(splitSymbol);
                for (const o of parsed) {
                  expect(o.suffix, where).toBe(a.suffix);
                  if (!doubles) expect(Math.abs(o.root.acc), where).toBeLessThan(2);
                }
                // If the answer's misspelling is offered, it isn't the only same-pitch pair.
                const pcs = parsed.map((o) => pitchClass(o.root));
                const pairs = pcs.filter((pc, i) => pcs.indexOf(pc) !== i).length;
                const answerPaired = pcs.filter((pc) => pc === pitchClass(a.root)).length > 1;
                if (answerPaired) expect(pairs, where).toBeGreaterThanOrEqual(2);
              } else {
                const a = numeralShape(q.answer);
                for (const o of q.options) expect(numeralShape(o), where).toEqual(a);
              }
            }
          }
        }
      }
    });
  }

  it('no chord asked twice in a row', () => {
    const cfg = defaultConfig('nameChord', parseKeyName('Bb')!, p);
    const rand = seeded(9);
    let prev = generateNameChordQuestion(cfg, opts(rand))!;
    for (let i = 0; i < 40; i++) {
      const q = generateNameChordQuestion(cfg, { ...opts(rand), previous: prev })!;
      expect(q.chord.degree).not.toBe(prev.chord.degree);
      prev = q;
    }
  });
});
