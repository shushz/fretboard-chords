/**
 * Web Audio playback. The AudioContext is created/resumed on the first user gesture
 * (mobile autoplay policies). Plucks are rendered once per MIDI note and cached.
 */
import { prefs } from '../prefs/store';
import { DEFAULT_PLUCK, midiToFreq, renderPluck, renderThunk, strumOffsets } from './synth';

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
const cache = new Map<number, AudioBuffer>();
let thunkBuf: AudioBuffer | null = null;

function getCtx(): Ctx | null {
  if (ctx) return ctx;
  const AC: typeof AudioContext | undefined =
    typeof window === 'undefined'
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  // gentle lowpass + compressor to keep chords clean
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  return ctx;
}

/** Call from a user gesture handler; safe to call repeatedly. */
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}

export function installAudioUnlock(): void {
  if (typeof window === 'undefined') return;
  const once = () => unlockAudio();
  window.addEventListener('pointerdown', once, { passive: true });
  window.addEventListener('keydown', once);
}

function volume(): number {
  const s = prefs.value.sound;
  return s.muted ? 0 : s.volume;
}

function bufferFor(c: Ctx, midi: number): AudioBuffer {
  let b = cache.get(midi);
  if (!b) {
    const data = renderPluck(midiToFreq(midi), c.sampleRate, DEFAULT_PLUCK);
    b = c.createBuffer(1, data.length, c.sampleRate);
    b.getChannelData(0).set(data);
    cache.set(midi, b);
  }
  return b;
}

function play(c: Ctx, buf: AudioBuffer, when: number, gain: number): void {
  if (!master) return;
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(g).connect(master);
  src.start(when);
}

export function playNote(midi: number): void {
  const v = volume();
  if (v === 0) return;
  const c = getCtx();
  if (!c) return;
  unlockAudio();
  play(c, bufferFor(c, midi), c.currentTime + 0.005, v * 0.7);
}

/** Strum notes low → high (pass MIDI numbers). */
export function strum(midis: readonly number[], delayS = 0): void {
  const v = volume();
  if (v === 0 || midis.length === 0) return;
  const c = getCtx();
  if (!c) return;
  unlockAudio();
  const sorted = [...midis].sort((a, b) => a - b);
  const offs = strumOffsets(sorted.length, prefs.value.sound.strumMs);
  const per = (v * 0.75) / Math.sqrt(sorted.length);
  const t0 = c.currentTime + 0.01 + delayS;
  sorted.forEach((m, i) => play(c, bufferFor(c, m), t0 + offs[i], per));
}

export function thunk(): void {
  const v = volume();
  if (v === 0) return;
  const c = getCtx();
  if (!c) return;
  unlockAudio();
  if (!thunkBuf) {
    const data = renderThunk(c.sampleRate);
    thunkBuf = c.createBuffer(1, data.length, c.sampleRate);
    thunkBuf.getChannelData(0).set(data);
  }
  play(c, thunkBuf, c.currentTime + 0.005, v * 0.8);
}

/** Feedback after grading: correct → strum the chord; wrong → muted thunk. */
export function feedback(correct: boolean, chordMidis: readonly number[] = []): void {
  if (correct) strum(chordMidis, 0.05);
  else thunk();
}
