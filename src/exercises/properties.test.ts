/**
 * Property tests: every mode against many generated setups. Each invariant here is a
 * rule that must hold for *every* key, chord, string set and window, not just examples.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, type Preferences, updatePreferences } from '../prefs/model';
import {
  DEGREES,
  type DegreeIndex,
  buildChord,
  chordSymbol,
  isSeventh,
  toneForPitchClass,
} from '../theory/chords';
import { type Key, keyToAscii, sameKey, selectableKeys } from '../theory/keys';
import { letterIndex, noteToAscii, pitchClass } from '../theory/notes';
import { memberOf } from '../theory/roles';
import {
  SEVENTH_STRING_SETS,
  type StringSetId,
  TRIAD_STRING_SETS,
  windowEnd,
} from '../fretboard/regions';
import type { StringNum } from '../fretboard/tuning';
import { type Voicing, fitsWindow, voicingId } from '../fretboard/voicings';
import { type PracticeConfig, concreteConfig, defaultConfig, voicingOptions } from './config';
import {
  type FindQuestion,
  generateFindQuestion,
  gradeFind,
  requiredStrings,
  anchorFrets,
} from './find/logic';
import {
  type TonicQuestion,
  generateTonicQuestion,
  gradeTonic,
  sameTonicQuestion,
} from './tonic/logic';
import { type ShapeQuestion, generateShapeQuestion, gradeShape } from './shape/logic';
import {
  type TonesQuestion,
  generateTonesQuestion,
  gradeLabels,
  gradeTapRole,
  roleChoices,
  roleFrets,
} from './tones/logic';
import {
  type SwitchQuestion,
  generateSwitchQuestion,
  resultNotes,
  tapSwitch,
} from './switch/logic';
import {
  type ProgressionQuestion,
  generateProgressionQuestion,
  gradeStep,
  progressionChoices,
  progressionsFor,
} from './progression/logic';
import { type NameChordQuestion, generateNameChordQuestion } from './namechord/logic';
import type { ModeId } from '../progress/types';

const P = DEFAULT_PREFERENCES;
const KEYS = selectableKeys(P.spelling);
const WINDOW_STARTS = [0, 2, 4, 5, 7, 9, 11];

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const taps = (v: { notes: readonly { string: StringNum; fret: number }[] }) =>
  new Map(v.notes.map((n) => [n.string, n.fret] as [StringNum, number]));

/** Move one note of a voicing one fret (staying on the neck). */
function nudge(v: Voicing, i: number): Map<StringNum, number> {
  const t = taps(v);
  const n = v.notes[i];
  t.set(n.string, n.fret > 0 ? n.fret - 1 : n.fret + 1);
  return t;
}

function cfgFor(
  mode: ModeId,
  key: Key,
  p: Preferences,
  over: Partial<PracticeConfig> = {},
): PracticeConfig {
  return { ...defaultConfig(mode, key, p, seeded(1)), ...over };
}

function opts(p: Preferences, seed = 7) {
  return { harmony: p.harmony, voicing: voicingOptions(p), rand: seeded(seed) };
}

/** Every voicing in a region fits its window and contains each required chord tone once. */
function expectValidVoicings(vs: readonly Voicing[], windowStart: number, windowEndFret: number) {
  for (const v of vs) {
    for (const n of v.notes) {
      expect(n.fret).toBeGreaterThanOrEqual(windowStart);
      expect(n.fret).toBeLessThanOrEqual(windowEndFret);
    }
    expect(new Set(v.notes.map((n) => n.role)).size).toBe(v.notes.length);
  }
}

describe('theory: spelling of every diatonic chord', () => {
  it('stacks letters (R–3–5–7 = every other letter) and matches pitch to role', () => {
    for (const k of selectableKeys({ ...P.spelling, allowTheoretical: true })) {
      for (const sevenths of [false, true]) {
        for (const d of DEGREES) {
          const c = defaultChord(k, d, sevenths);
          c.tones.forEach((t, i) => {
            expect((letterIndex(t.note.letter) - letterIndex(c.root.letter) + 7) % 7).toBe(
              (2 * i) % 7,
            );
          });
          expect(Math.abs(c.tones[0].note.acc)).toBeLessThanOrEqual(2);
        }
      }
    }
  });
});

function defaultChord(k: Key, d: DegreeIndex, sevenths: boolean) {
  const q = generateFindQuestion(
    cfgFor('find', k, P, { degrees: [d], sevenths, stringSets: sevenths ? ['2-5'] : ['2-4'] }),
    opts(P),
  );
  return q!.chord;
}

describe('find the chord', () => {
  it('every chord can be asked on every string set and window; grading is exact', () => {
    for (const k of KEYS) {
      for (const d of DEGREES) {
        for (const set of TRIAD_STRING_SETS) {
          for (const start of WINDOW_STARTS) {
            const cfg = cfgFor('find', k, P, {
              degrees: [d],
              stringSets: [set],
              window: { start, width: 5 },
            });
            const q = generateFindQuestion(cfg, opts(P));
            const where = `${keyToAscii(k)} deg ${d} ${set} @${start}`;
            expect(q, where).not.toBeNull();
            expect(q!.chord.degree).toBe(d);
            const w = q!.region.window;
            expect(w.start).toBeLessThanOrEqual(start);
            expect(windowEnd(w)).toBeGreaterThanOrEqual(start + 4);
            expectValidVoicings(q!.valid, w.start, windowEnd(w));
            for (const v of q!.valid) {
              expect(gradeFind(q!, taps(v), 15).correct, where).toBe(true);
              for (let i = 0; i < v.notes.length; i++) {
                const t = nudge(v, i);
                const stillValid = q!.valid.some(
                  (x) =>
                    voicingId(x) ===
                    voicingId({
                      notes: [...t]
                        .map(([s, f]) => ({ string: s, fret: f, midi: 0, pc: 0 }))
                        .sort((a, b) => b.string - a.string),
                    }),
                );
                expect(gradeFind(q!, t, 15).correct, where).toBe(stillValid);
              }
            }
          }
        }
      }
    }
  });
  it('sevenths (drop-2) are asked on every 4-string set', () => {
    const p = updatePreferences(P, (d) => void (d.sevenths.enabled = true));
    for (const k of KEYS) {
      for (const d of DEGREES) {
        for (const set of SEVENTH_STRING_SETS) {
          const q = generateFindQuestion(
            cfgFor('find', k, p, { degrees: [d], stringSets: [set], sevenths: true }),
            opts(p),
          );
          expect(q, `${keyToAscii(k)} ${d} ${set}`).not.toBeNull();
          expect(isSeventh(q!.chord.quality)).toBe(true);
          for (const v of q!.valid) expect(v.notes).toHaveLength(4);
        }
      }
    }
  });
  it('anchored: the required anchor string always has a root within the window ± 2', () => {
    for (const k of KEYS) {
      for (const set of ['1-3', '2-4'] as StringSetId[]) {
        const cfg = cfgFor('find', k, P, {
          stringSets: [set],
          anchor: 'required',
          anchorStrings: [6, 5],
        });
        const rand = seeded(3);
        for (let i = 0; i < 10; i++) {
          const q = generateFindQuestion(cfg, { ...opts(P), rand })!;
          expect(q.anchorString).not.toBeNull();
          expect(requiredStrings(q)).toContain(q.anchorString);
          expect(anchorFrets(q, q.anchorString!, 15).length).toBeGreaterThan(0);
        }
      }
    }
  });
});

/** Consecutive questions differ whenever the setup allows more than one question. */
function expectNoRepeats<Q>(gen: (prev: Q | null) => Q | null, id: (q: Q) => string, n = 25) {
  let prev: Q | null = null;
  const seen = new Set<string>();
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const q = gen(prev);
    expect(q).not.toBeNull();
    ids.push(id(q!));
    seen.add(id(q!));
    prev = q;
  }
  if (seen.size > 1)
    for (let i = 1; i < ids.length; i++) expect(ids[i], `repeat at ${i}`).not.toBe(ids[i - 1]);
}

describe('no identical consecutive questions (every mode)', () => {
  const k = KEYS.find((x) => keyToAscii(x) === 'F#m')!;
  const kMaj = KEYS.find((x) => keyToAscii(x) === 'Bb')!;
  for (const key of [k, kMaj]) {
    it(`in ${keyToAscii(key)}`, () => {
      const rand = seeded(5);
      const o = { ...opts(P), rand };
      expectNoRepeats<FindQuestion>(
        (prev) => generateFindQuestion(cfgFor('find', key, P), { ...o, previous: prev }),
        (q) => `${q.chord.degree}|${q.region.stringSet}|${q.region.window.start}`,
      );
      expectNoRepeats<TonicQuestion>(
        (prev) => generateTonicQuestion(cfgFor('fromTonic', key, P), { ...o, previous: prev }),
        (q) => `${q.target.degree}|${voicingId(q.tonicVoicing)}`,
      );
      expectNoRepeats<ShapeQuestion>(
        (prev) => generateShapeQuestion(cfgFor('nextShape', key, P), { ...o, previous: prev }),
        (q) => `${q.chord.degree}|${voicingId(q.shown)}|${q.direction}`,
      );
      expectNoRepeats<TonesQuestion>(
        (prev) => generateTonesQuestion(cfgFor('nameTones', key, P), { ...o, previous: prev }),
        (q) =>
          q.kind === 'label'
            ? `L${voicingId(q.voicing)}`
            : `T${q.chord.degree}${q.role}${q.string}`,
      );
      expectNoRepeats<SwitchQuestion>(
        (prev) =>
          generateSwitchQuestion(cfgFor('qualitySwitch', key, P), {
            ...o,
            previous: prev,
            extensions: { minDim: true, majAug: true, dom7: true },
          }),
        (q) => `${q.source.degree}|${voicingId(q.voicing)}|${q.def.to}`,
      );
      expectNoRepeats<ProgressionQuestion>(
        (prev) =>
          generateProgressionQuestion(cfgFor('progression', key, P), { ...o, previous: prev }),
        (q) => `${q.progression.id}|${q.region.stringSet}`,
      );
      expectNoRepeats<NameChordQuestion>(
        (prev) =>
          generateNameChordQuestion(cfgFor('nameChord', key, P), {
            ...o,
            previous: prev,
            symbol: { glyphs: true, dimStyle: 'symbol' },
            numeral: { glyphs: true, dimStyle: 'symbol' },
          }),
        (q) => `${q.direction}|${q.chord.degree}`,
      );
    });
  }
  it('from the tonic never repeats even with a single target (all keys)', () => {
    for (const key of KEYS) {
      const rand = seeded(11);
      let prev: TonicQuestion | null = null;
      for (let i = 0; i < 10; i++) {
        const q: TonicQuestion = generateTonicQuestion(
          cfgFor('fromTonic', key, P, { degrees: [4] }),
          {
            ...opts(P),
            rand,
            previous: prev,
          },
        )!;
        if (prev) expect(sameTonicQuestion(q, prev)).toBe(false);
        prev = q;
      }
    }
  });
});

describe('every mode, every key: questions are answerable and grade correctly', () => {
  const rand = seeded(13);
  for (const key of KEYS) {
    it(keyToAscii(key), () => {
      const o = { ...opts(P), rand };
      for (let i = 0; i < 6; i++) {
        // from the tonic
        const t = generateTonicQuestion(cfgFor('fromTonic', key, P, { degrees: [...DEGREES] }), o)!;
        expect(fitsWindow(t.tonicVoicing, t.region.window)).toBe(true);
        expect(t.target.degree).not.toBe(0);
        for (const v of t.valid) expect(gradeTonic(t, taps(v)).correct).toBe(true);
        for (const v of t.smooth) expect(gradeTonic(t, taps(v)).smooth).toBe(true);

        // next / previous shape
        const s = generateShapeQuestion(cfgFor('nextShape', key, P, { degrees: [...DEGREES] }), o)!;
        expect(gradeShape(s, taps(s.target)).correct).toBe(true);
        expect(gradeShape(s, taps(s.shown)).correct).toBe(false);
        expect(s.target.inversion).not.toBe(s.shown.inversion);

        // name the tones
        const n = generateTonesQuestion(cfgFor('nameTones', key, P, { degrees: [...DEGREES] }), o)!;
        if (n.kind === 'label') {
          expect(
            gradeLabels(
              n,
              n.voicing.notes.map((x) => x.role),
            ).correct,
          ).toBe(true);
          for (const x of n.voicing.notes) expect(roleChoices(n.chord)).toContain(x.role);
        } else {
          const frets = roleFrets(n.chord, n.role, n.string, n.window, 15);
          expect(frets.length).toBeGreaterThan(0);
          for (const f of frets) expect(gradeTapRole(n, n.string, f)).toBe(true);
        }

        // quality switch: moving the one note gives exactly the target chord
        const sw = generateSwitchQuestion(
          cfgFor('qualitySwitch', key, P, { degrees: [...DEGREES] }),
          {
            ...o,
            extensions: { minDim: true, majAug: true, dom7: true },
          },
        )!;
        expect(tapSwitch(sw, sw.moving.string, sw.toFret).kind).toBe('correct');
        const res = resultNotes(sw);
        for (const r of res) expect(toneForPitchClass(sw.target, r.pc)).not.toBeNull();
        const members = new Set(res.map((r) => memberOf(r.role)));
        if (sw.def.family !== 'dom7') expect(members.size).toBe(sw.voicing.notes.length);
        expect(buildChord(sw.source.root, sw.def.to).quality).toBe(sw.target.quality);

        // name the chord: the right answer is the chord's own symbol
        const nc = generateNameChordQuestion(
          cfgFor('nameChord', key, P, { degrees: [...DEGREES], variant: 'forward' }),
          {
            ...o,
            symbol: { glyphs: true, dimStyle: 'symbol' },
            numeral: { glyphs: true, dimStyle: 'symbol' },
          },
        )!;
        expect(nc.answer).toBe(chordSymbol(nc.chord, { glyphs: true, dimStyle: 'symbol' }));
        expect(new Set(nc.options).size).toBe(4);
        expect(nc.options).toContain(nc.answer);
      }

      // progression walk: every built-in progression of the key's mode, every set
      for (const pr of progressionsFor(key.mode)) {
        for (const set of TRIAD_STRING_SETS) {
          const q = generateProgressionQuestion(
            cfgFor('progression', key, P, { variant: pr.id, stringSets: [set] }),
            o,
          );
          expect(q, `${pr.id} ${set}`).not.toBeNull();
          let prev: Voicing | null = null;
          q!.chords.forEach((c, i) => {
            expect(c.key).toEqual(key);
            const g = gradeStep(q!, i, taps(q!.valid[i][0]), prev);
            expect(g.correct).toBe(true);
            prev = g.matched;
          });
        }
      }
    });
  }
});

describe('setup lists are never empty', () => {
  it('progression choices for every key choice', () => {
    for (const k of KEYS) {
      for (const randomKey of [undefined, 'major', 'minor', 'both'] as const) {
        const list = progressionChoices({ key: k, randomKey });
        expect(list.length).toBeGreaterThanOrEqual(5);
        if (randomKey === 'both') expect(list).toHaveLength(10);
        if (randomKey === 'major' || randomKey === 'minor') {
          for (const pr of list) expect(pr.mode).toBe(randomKey);
        }
      }
    }
  });
});

describe('random keys', () => {
  it('never the same key twice in a row; keys follow spelling preferences', () => {
    for (const mode of ['major', 'minor', 'both'] as const) {
      const cfg = cfgFor('find', KEYS[0], P, { randomKey: mode });
      const rand = seeded(17);
      let prev: Key | null = null;
      for (let i = 0; i < 100; i++) {
        const c = concreteConfig(cfg, P, prev, rand);
        if (prev) expect(sameKey(c.key, prev)).toBe(false);
        expect(KEYS.some((k) => sameKey(k, c.key))).toBe(true);
        if (mode !== 'both') expect(c.key.mode).toBe(mode);
        prev = c.key;
      }
    }
  });
});

describe('pitch classes on the board match spelled chord tones', () => {
  it('every voicing note is a chord tone of the right role', () => {
    for (const k of KEYS) {
      for (const d of DEGREES) {
        const q = generateFindQuestion(
          cfgFor('find', k, P, { degrees: [d], stringSets: ['2-4'] }),
          opts(P),
        )!;
        for (const v of q.valid) {
          for (const n of v.notes) {
            expect(pitchClass(n.tone.note)).toBe(n.pc);
            expect(toneForPitchClass(q.chord, n.pc)?.role).toBe(n.role);
            expect(noteToAscii(n.tone.note)).toMatch(/^[A-G](bb|b|#|##)?$/);
          }
        }
      }
    }
  });
});
