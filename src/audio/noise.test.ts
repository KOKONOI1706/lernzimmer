import { describe, expect, it } from 'vitest';
import { brown, crackle, mulberry32, pink, rain, tick, typewriter, white } from './noise';

const SR = 8000;
const peak = (b: Float32Array) => b.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const rms = (b: Float32Array) => Math.sqrt(b.reduce((s, v) => s + v * v, 0) / b.length);
/** average |difference| between neighbours: high for white, low for brown */
const roughness = (b: Float32Array) => b.slice(1).reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / (b.length - 1);

describe('procedural noise', () => {
  it('all generators stay within [-1, 1] and have the right length', () => {
    const r = mulberry32(1);
    const bufs = [white(SR, r), pink(SR, r), brown(SR, r), rain(SR, 2, r), crackle(SR, 2, r), tick(SR), typewriter(SR, 2, r)];
    for (const b of bufs) {
      expect(peak(b)).toBeLessThanOrEqual(1);
      expect(Number.isFinite(rms(b))).toBe(true);
    }
    expect(bufs[3].length).toBe(2 * SR);
    expect(bufs[5].length).toBe(SR);
  });

  it('is deterministic for a seed', () => {
    expect(pink(100, mulberry32(7))).toEqual(pink(100, mulberry32(7)));
  });

  it('colours are ordered white > pink > brown in high-frequency content', () => {
    const w = white(SR, mulberry32(2)), p = pink(SR, mulberry32(2)), b = brown(SR, mulberry32(2));
    expect(roughness(w) / rms(w)).toBeGreaterThan(roughness(p) / rms(p));
    expect(roughness(p) / rms(p)).toBeGreaterThan(roughness(b) / rms(b));
  });

  it('crackle is mostly silence with sparse pops', () => {
    const c = crackle(SR, 4, mulberry32(3));
    const quiet = c.filter((v) => Math.abs(v) < 0.01).length / c.length;
    expect(quiet).toBeGreaterThan(0.5);
    expect(peak(c)).toBeGreaterThan(0.5);
  });
});
