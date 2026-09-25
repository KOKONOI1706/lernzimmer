// Pure sample generators for procedural ambience. Each returns a mono Float32Array in [-1, 1]
// that loops without an audible seam (noise has no phase to break; impulses are short).

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Scale so the loudest sample hits `peak`. */
export function normalize(buf: Float32Array, peak = 0.9): Float32Array {
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  if (max > 0) for (let i = 0; i < buf.length; i++) buf[i] = (buf[i] / max) * peak;
  return buf;
}

export function white(n: number, rnd: Rng): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = rnd() * 2 - 1;
  return out;
}

/** Pink (1/f) noise, Paul Kellet's refined filter. */
export function pink(n: number, rnd: Rng): Float32Array {
  const out = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = rnd() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    out[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
  }
  return normalize(out);
}

/** Brown (1/f²) noise: leaky random walk. Deep rumble for fire, wind, waves, trains. */
export function brown(n: number, rnd: Rng): Float32Array {
  const out = new Float32Array(n);
  let last = 0;
  for (let i = 0; i < n; i++) {
    last = (last + 0.02 * (rnd() * 2 - 1)) / 1.02;
    out[i] = last;
  }
  return normalize(out);
}

/** Add decaying noise bursts ("clicks") at random times. rate = events per second. */
function sprinkle(out: Float32Array, sr: number, rnd: Rng, rate: number, decayMs: [number, number], amp: [number, number]) {
  const events = Math.round((out.length / sr) * rate);
  for (let e = 0; e < events; e++) {
    const start = Math.floor(rnd() * out.length);
    const tau = ((decayMs[0] + rnd() * (decayMs[1] - decayMs[0])) / 1000) * sr;
    const a = amp[0] + rnd() * (amp[1] - amp[0]);
    const len = Math.min(Math.floor(tau * 6), out.length);
    for (let i = 0; i < len; i++) out[(start + i) % out.length] += a * Math.exp(-i / tau) * (rnd() * 2 - 1);
  }
}

/** Rain: soft hiss plus many tiny droplets. */
export function rain(sr: number, seconds: number, rnd: Rng): Float32Array {
  const out = pink(Math.floor(sr * seconds), rnd).map((v) => v * 0.35);
  sprinkle(out, sr, rnd, 60, [1, 6], [0.2, 0.9]);
  return normalize(out, 0.8);
}

/** Fire crackles: sparse sharp pops over silence (the rumble is a separate filtered brown noise). */
export function crackle(sr: number, seconds: number, rnd: Rng): Float32Array {
  const out = new Float32Array(Math.floor(sr * seconds));
  sprinkle(out, sr, rnd, 7, [0.5, 3], [0.3, 1]);
  sprinkle(out, sr, rnd, 1.5, [8, 25], [0.05, 0.2]); // occasional hiss
  return normalize(out, 0.8);
}

/** One clock tick per second (buffer is exactly one second long). */
export function tick(sr: number): Float32Array {
  const out = new Float32Array(sr);
  const len = Math.floor(sr * 0.012);
  for (let i = 0; i < len; i++) out[i] = Math.sin((2 * Math.PI * 2800 * i) / sr) * Math.exp(-i / (sr * 0.002));
  return normalize(out, 0.7);
}

/** Typewriter: bursts of keystrokes with pauses. */
export function typewriter(sr: number, seconds: number, rnd: Rng): Float32Array {
  const out = new Float32Array(Math.floor(sr * seconds));
  let t = 0;
  while (t < seconds) {
    const word = 3 + Math.floor(rnd() * 7);
    for (let k = 0; k < word && t < seconds; k++) {
      const start = Math.floor(t * sr);
      const tau = sr * (0.0015 + rnd() * 0.002);
      const a = 0.5 + rnd() * 0.5;
      for (let i = 0; i < tau * 8 && start + i < out.length; i++) out[start + i] += a * Math.exp(-i / tau) * (rnd() * 2 - 1);
      t += 0.09 + rnd() * 0.12;
    }
    t += 0.25 + rnd() * 0.6;
  }
  return normalize(out, 0.8);
}
