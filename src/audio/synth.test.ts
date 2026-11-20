import { describe, expect, it } from 'vitest';
import { estimateFrequency, midiToFreq, renderPluck, renderThunk, strumOffsets } from './synth';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

describe('synth', () => {
  it('midi to frequency', () => {
    expect(midiToFreq(69)).toBeCloseTo(440);
    expect(midiToFreq(40)).toBeCloseTo(82.41, 1);
    expect(midiToFreq(64)).toBeCloseTo(329.63, 1);
  });
  it('renders a finite, decaying pluck at the right pitch', () => {
    const sr = 44100;
    const f = midiToFreq(57); // A3 220 Hz
    const buf = renderPluck(f, sr, {
      duration: 1,
      decay: 0.996,
      brightness: 0.5,
      random: seeded(),
    });
    expect(buf.length).toBe(sr);
    expect(buf.every((v) => Number.isFinite(v))).toBe(true);
    const rms = (a: number, b: number) =>
      Math.sqrt(buf.slice(a, b).reduce((s, v) => s + v * v, 0) / (b - a));
    expect(rms(0, 4410)).toBeGreaterThan(rms(30000, 34410));
    const est = estimateFrequency(buf, sr);
    expect(Math.abs(1200 * Math.log2(est / f))).toBeLessThan(20); // within 20 cents
  });
  it('thunk is short', () => {
    const t = renderThunk(44100, seeded(3));
    expect(t.length).toBeLessThan(44100 * 0.2);
  });
  it('strum offsets', () => {
    expect(strumOffsets(3, 30)).toEqual([0, 0.03, 0.06]);
    expect(strumOffsets(3, 30, false)).toEqual([0.06, 0.03, 0]);
  });
});
