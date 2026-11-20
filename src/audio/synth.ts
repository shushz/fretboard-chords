/** Pure DSP helpers (no Web Audio), unit-testable. */

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export interface PluckOptions {
  /** Seconds of audio to render. */
  duration: number;
  /** Per-sample loop gain (0.99..0.9999): higher = longer sustain. */
  decay: number;
  /** 0..1 — lowpass in the excitation; lower = darker/softer pick. */
  brightness: number;
  /** Deterministic PRNG for tests. */
  random?: () => number;
}

export const DEFAULT_PLUCK: PluckOptions = { duration: 2.2, decay: 0.996, brightness: 0.55 };

/**
 * Karplus–Strong plucked string with a fractional-delay allpass for tuning accuracy,
 * a softened noise burst for the pick, and a short fade-out.
 */
export function renderPluck(
  freq: number,
  sampleRate: number,
  opts: PluckOptions = DEFAULT_PLUCK,
): Float32Array {
  const rand = opts.random ?? Math.random;
  const n = Math.floor(opts.duration * sampleRate);
  const out = new Float32Array(n);
  const period = sampleRate / freq;
  // Two-point averaging filter adds ~0.5 sample delay.
  const delayTotal = period - 0.5;
  const N = Math.max(2, Math.floor(delayTotal));
  const frac = delayTotal - N;
  const c = (1 - frac) / (1 + frac); // allpass coefficient
  const buf = new Float32Array(N);
  // Excitation: noise smoothed by a one-pole lowpass (brightness).
  let lp = 0;
  const a = Math.min(0.99, Math.max(0.05, opts.brightness));
  for (let i = 0; i < N; i++) {
    lp += a * (rand() * 2 - 1 - lp);
    buf[i] = lp;
  }
  // remove DC
  const mean = buf.reduce((s, v) => s + v, 0) / N;
  for (let i = 0; i < N; i++) buf[i] -= mean;

  let idx = 0;
  let apX = 0;
  let apY = 0;
  let prev = 0;
  const fadeStart = n - Math.floor(0.05 * sampleRate);
  for (let i = 0; i < n; i++) {
    const cur = buf[idx];
    const avg = opts.decay * 0.5 * (cur + prev);
    prev = cur;
    // first-order allpass for fractional delay
    const y = c * avg + apX - c * apY;
    apX = avg;
    apY = y;
    buf[idx] = y;
    idx = (idx + 1) % N;
    let s = cur;
    if (i > fadeStart) s *= (n - i) / (n - fadeStart);
    out[i] = s;
  }
  normalize(out, 0.9);
  return out;
}

/** Muted "thunk": a very short, dark, damped pluck. */
export function renderThunk(sampleRate: number, random?: () => number): Float32Array {
  const out = renderPluck(midiToFreq(40), sampleRate, {
    duration: 0.18,
    decay: 0.95,
    brightness: 0.12,
    random,
  });
  // percussive envelope
  for (let i = 0; i < out.length; i++) out[i] *= Math.exp((-i / sampleRate) * 28);
  normalize(out, 0.8);
  return out;
}

export function normalize(buf: Float32Array, peak: number): void {
  let max = 0;
  for (let i = 0; i < buf.length; i++) max = Math.max(max, Math.abs(buf[i]));
  if (max === 0) return;
  const g = peak / max;
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
}

/** Strum timing: offsets (s) for notes ordered low → high. */
export function strumOffsets(count: number, strumMs: number, down = true): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(((down ? i : count - 1 - i) * strumMs) / 1000);
  return out;
}

/** Estimate the fundamental via zero crossings (test helper, rough). */
export function estimateFrequency(
  buf: Float32Array,
  sampleRate: number,
  from = 0.1,
  to = 0.5,
): number {
  const a = Math.floor(from * sampleRate);
  const b = Math.floor(to * sampleRate);
  // autocorrelation peak search
  let bestLag = 0;
  let best = -Infinity;
  for (let lag = 20; lag < 2000; lag++) {
    let s = 0;
    for (let i = a; i < b - lag; i += 2) s += buf[i] * buf[i + lag];
    if (s > best) {
      best = s;
      bestLag = lag;
    }
  }
  return sampleRate / bestLag;
}
