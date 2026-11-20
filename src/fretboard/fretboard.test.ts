import { describe, expect, it } from 'vitest';
import { buildChord, diatonicChord } from '../theory/chords';
import { key } from '../theory/keys';
import { note, noteToAscii } from '../theory/notes';
import {
  adjacentShape,
  enumerateVoicings,
  fitsWindow,
  isDrop2,
  distanceToWindow,
  nearestOutside,
  fretsForPitchClass,
  fretted,
  matchVoicing,
  midiAt,
  movement,
  nearestAnchor,
  pairAnchors,
  pitchClassAt,
  randomWindow,
  smoothestVoicings,
  stringsOf,
  voicingId,
  voicingsInRegion,
} from './index';

const fsm = buildChord(note('F', 1), 'min');
const opts = { maxFret: 15, maxSpan: 4 };

describe('tuning', () => {
  it('pitch at (string, fret)', () => {
    expect(midiAt(1, 0)).toBe(64);
    expect(midiAt(6, 0)).toBe(40);
    expect(pitchClassAt(3, 6)).toBe(1); // C#
    expect(pitchClassAt(2, 7)).toBe(6); // F#
    expect(pitchClassAt(1, 5)).toBe(9); // A
    expect(fretsForPitchClass(6, 6, 15)).toEqual([2, 14]);
  });
  it('string sets', () => {
    expect(stringsOf('2-4')).toEqual([2, 3, 4]);
    expect(stringsOf('3-6')).toEqual([3, 4, 5, 6]);
  });
});

describe('voicing enumeration', () => {
  it('SPEC §4 example: F#m on 1–3 at frets 5–7', () => {
    const vs = voicingsInRegion(fsm, { stringSet: '1-3', window: { start: 5, width: 3 } }, opts);
    expect(vs).toHaveLength(1);
    const v = vs[0];
    expect(voicingId(v)).toBe('3:6,2:7,1:5');
    expect(v.notes.map((n) => n.role)).toEqual(['5', 'R', 'b3']);
    expect(v.notes.map((n) => noteToAscii(n.tone.note))).toEqual(['C#', 'F#', 'A']);
    expect(v.inversion).toBe('second');
    expect(v.position).toBe(5);
    expect(v.span).toBe(3);
  });
  it('three closed inversions per octave on each triad set', () => {
    for (const set of ['1-3', '2-4', '3-5', '4-6'] as const) {
      const vs = enumerateVoicings(fsm, set, { maxFret: 27, maxSpan: 4 });
      const firstOctave = vs.filter((v) => v.position >= 0 && v.position < 12);
      expect(firstOctave).toHaveLength(3);
      expect(new Set(firstOctave.map((v) => v.inversion))).toEqual(
        new Set(['root', 'first', 'second']),
      );
      // every voicing repeats an octave higher
      for (const v of firstOctave) {
        const up = v.notes.map((n) => `${n.string}:${n.fret + 12}`).join(',');
        expect(vs.some((w) => voicingId(w) === up)).toBe(true);
      }
    }
  });
  it('every voicing has each chord tone once and respects span', () => {
    const c = diatonicChord(key(note('E', -1), 'minor'), 1); // F°
    for (const v of enumerateVoicings(c, '2-4', opts)) {
      expect(new Set(v.notes.map((n) => n.role)).size).toBe(3);
      expect(v.span).toBeLessThanOrEqual(4);
      expect(v.notes.map((n) => n.string)).toEqual([4, 3, 2]);
    }
  });
  it('seventh chords: drop-2 style 4-note voicings on 4-string sets; shells on 3', () => {
    const g7 = buildChord(note('G'), '7');
    const vs = enumerateVoicings(g7, '1-4', { maxFret: 15, maxSpan: 4 });
    expect(vs.length).toBeGreaterThan(0);
    for (const v of vs) expect(new Set(v.notes.map((n) => n.role)).size).toBe(4);
    expect(enumerateVoicings(g7, '1-3', opts)).toEqual([]);
    const shells = enumerateVoicings(g7, '2-4', { ...opts, shells: true });
    expect(shells.length).toBeGreaterThan(0);
    for (const v of shells) {
      expect(v.shell).toBe(true);
      expect(v.notes.some((n) => n.role === '5')).toBe(false);
    }
    expect(enumerateVoicings(fsm, '1-4', opts)).toEqual([]);
  });
  it('drop-2: four inversions per octave on every 4-string set, for every seventh quality', () => {
    for (const q of ['maj7', '7', 'm7', 'm7b5'] as const) {
      const c = buildChord(note('C'), q);
      for (const set of ['1-4', '2-5', '3-6'] as const) {
        const vs = enumerateVoicings(c, set, { maxFret: 27, maxSpan: 4 }).filter(
          (v) => v.position < 12,
        );
        expect(vs.map((v) => v.inversion).sort()).toEqual(['first', 'root', 'second', 'third']);
        for (const v of vs) expect(isDrop2(v.notes.map((n) => n.midi))).toBe(true);
      }
    }
  });
  it('isDrop2', () => {
    // Cmaj7 drop-2 on D-G-B-E: C(D10) G(G12) B(B12) E(E12)
    expect(isDrop2([60, 67, 71, 76])).toBe(true);
    // close position C E G B
    expect(isDrop2([60, 64, 67, 71])).toBe(false);
    // drop-3: C B E G
    expect(isDrop2([48, 59, 64, 67])).toBe(false);
  });
  it('fitsWindow with one note outside', () => {
    const v = enumerateVoicings(fsm, '1-3', opts).find((x) => voicingId(x) === '3:6,2:7,1:5')!;
    expect(fitsWindow(v, { start: 6, width: 5 })).toBe(false);
    expect(fitsWindow(v, { start: 6, width: 5 }, true)).toBe(true);
    expect(fitsWindow(v, { start: 7, width: 5 }, true)).toBe(false);
  });
  it('matchVoicing grades tapped notes in any order', () => {
    const vs = voicingsInRegion(fsm, { stringSet: '1-3', window: { start: 4, width: 5 } }, opts);
    const ans = [fretted(1, 5), fretted(3, 6), fretted(2, 7)];
    expect(matchVoicing(ans, vs)).not.toBeNull();
    expect(matchVoicing([fretted(1, 5), fretted(3, 6), fretted(2, 6)], vs)).toBeNull();
  });
  it('randomWindow fits', () => {
    expect(randomWindow(5, 15, () => 0.999).start).toBe(11);
    expect(randomWindow(5, 15, () => 0).start).toBe(0);
  });
});

describe('nearest shapes outside a window', () => {
  it('F♯m V on 1–3 has no shape in frets 5–9; nearest are 4–6 and 9–10', () => {
    const V = buildChord(note('C', 1), 'maj');
    const w = { start: 5, width: 5 };
    expect(voicingsInRegion(V, { stringSet: '1-3', window: w }, opts)).toEqual([]);
    const near = nearestOutside(enumerateVoicings(V, '1-3', opts), w);
    expect(near.slice(0, 2).map((v) => `${v.position}-${v.highestFret}`)).toEqual(['4-6', '9-10']);
    expect(distanceToWindow(near[0], w)).toBe(0);
    expect(distanceToWindow(near[near.length - 1], w)).toBeGreaterThan(0);
  });
});

describe('anchors', () => {
  it('pairs a 2–4 triad with the nearest root on string 6 and 5', () => {
    const v = enumerateVoicings(fsm, '2-4', opts).find((x) => x.position >= 9 && x.position <= 12)!;
    const a6 = nearestAnchor(fsm, v, 6, 15);
    expect(a6?.note.fret).toBe(14);
    expect(a6?.note.role).toBe('R');
    const a5 = nearestAnchor(fsm, v, 5, 15);
    expect(a5?.note.fret).toBe(9);
  });
  it('anchor must be below the string set and within window ± 2', () => {
    const v = enumerateVoicings(fsm, '4-6', opts)[0];
    expect(nearestAnchor(fsm, v, 6, 15)).toBeNull();
    const up = enumerateVoicings(fsm, '1-3', opts).find((x) => voicingId(x) === '3:6,2:7,1:5')!;
    expect(nearestAnchor(fsm, up, 6, 15, { start: 5, width: 5 })).toBeNull(); // F# at 2/14
    expect(nearestAnchor(fsm, up, 5, 15, { start: 5, width: 5 })?.note.fret).toBe(9);
    expect(pairAnchors(fsm, [up], [5, 6], 15)).toHaveLength(2);
  });
});

describe('movement helpers', () => {
  const all = enumerateVoicings(fsm, '1-3', opts);
  it('adjacent shapes up and down the neck', () => {
    const v = all.find((x) => voicingId(x) === '3:6,2:7,1:5')!;
    const up = adjacentShape(v, all, 1)!;
    const down = adjacentShape(v, all, -1)!;
    expect(up.inversion).not.toBe(v.inversion);
    expect(down.inversion).not.toBe(v.inversion);
    expect(up.position).toBeGreaterThan(v.position);
    expect(down.position).toBeLessThan(v.position);
  });
  it('smoothest voicing from i to iv', () => {
    const k = key(note('F', 1), 'minor');
    const i = all.find((x) => voicingId(x) === '3:6,2:7,1:5')!;
    const iv = enumerateVoicings(diatonicChord(k, 3), '1-3', opts);
    const best = smoothestVoicings(i, iv);
    expect(best.length).toBeGreaterThan(0);
    const m = movement(i, best[0]);
    for (const v of iv) expect(movement(i, v)).toBeGreaterThanOrEqual(m);
    // B minor near 7: 3:7 (D), 2:7 (F#), 1:7 (B) → movement 1+0+2 = 3
    expect(voicingId(best[0])).toBe('3:7,2:7,1:7');
    expect(m).toBe(3);
  });
});
