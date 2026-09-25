import manifest from '../../assets/manifest.json';
import type { Lang } from '../i18n/strings';
import { brown, crackle, mulberry32, pink, rain, tick, typewriter, white } from './noise';
import type { SpriteName } from '../ui/Sprite';

type Label = Record<Lang, string>;

export interface LayerDef {
  id: string;
  label: Label;
  icon: SpriteName;
  group: 'noise' | 'nature' | 'city' | 'germany' | 'vietnam';
  /** procedural recipe; recorded layers use `url` instead */
  build?: (ctx: AudioContext, out: AudioNode) => () => void;
  url?: string;
}

// ── buffer cache (per AudioContext sample rate) ──
const buffers = new Map<string, AudioBuffer>();
function buffer(ctx: AudioContext, key: string, make: (sr: number) => Float32Array): AudioBuffer {
  const k = `${key}@${ctx.sampleRate}`;
  let b = buffers.get(k);
  if (!b) {
    const data = make(ctx.sampleRate);
    b = ctx.createBuffer(1, data.length, ctx.sampleRate);
    b.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
    buffers.set(k, b);
  }
  return b;
}
const SECONDS = 8;
const seedFor = (key: string) => [...key].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
const noiseBuf = (ctx: AudioContext, kind: 'white' | 'pink' | 'brown') =>
  buffer(ctx, kind, (sr) => ({ white, pink, brown })[kind](sr * SECONDS, mulberry32(seedFor(kind))));

/** Small graph-building helpers. Every recipe returns a stop() that tears its nodes down. */
function loop(ctx: AudioContext, buf: AudioBuffer): AudioBufferSourceNode {
  const s = ctx.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.start(ctx.currentTime, Math.random() * buf.duration); // random offset so layers don't phase
  return s;
}
function filter(ctx: AudioContext, type: BiquadFilterType, freq: number, q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  return f;
}
function gain(ctx: AudioContext, v: number) { const g = ctx.createGain(); g.gain.value = v; return g; }
function lfo(ctx: AudioContext, hz: number, depth: number, target: AudioParam) {
  const o = ctx.createOscillator(); o.frequency.value = hz;
  const d = gain(ctx, depth);
  o.connect(d).connect(target);
  o.start();
  return o;
}
function chain(...nodes: AudioNode[]) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); }
const stopAll = (nodes: AudioNode[]) => () => nodes.forEach((n) => { try { (n as AudioScheduledSourceNode).stop?.(); } catch { /* already stopped */ } n.disconnect(); });

const PROCEDURAL: LayerDef[] = [
  {
    id: 'rain', group: 'nature', icon: 'raindrop', label: { de: 'Regen', vi: 'Mưa', en: 'Rain' },
    build: (ctx, out) => {
      const drops = loop(ctx, buffer(ctx, 'rain', (sr) => rain(sr, SECONDS, mulberry32(11))));
      const hp = filter(ctx, 'highpass', 400), lp = filter(ctx, 'lowpass', 9000);
      const body = loop(ctx, noiseBuf(ctx, 'pink')), bodyLp = filter(ctx, 'lowpass', 1200), bodyG = gain(ctx, 0.3);
      chain(drops, hp, lp, out); chain(body, bodyLp, bodyG, out);
      return stopAll([drops, hp, lp, body, bodyLp, bodyG]);
    },
  },
  {
    id: 'fire', group: 'nature', icon: 'fire', label: { de: 'Kaminfeuer', vi: 'Lửa củi', en: 'Fireplace' },
    build: (ctx, out) => {
      const rumble = loop(ctx, noiseBuf(ctx, 'brown')), lp = filter(ctx, 'lowpass', 260), rg = gain(ctx, 0.9);
      const pops = loop(ctx, buffer(ctx, 'crackle', (sr) => crackle(sr, SECONDS, mulberry32(13)))), hp = filter(ctx, 'highpass', 900), pg = gain(ctx, 0.8);
      chain(rumble, lp, rg, out); chain(pops, hp, pg, out);
      return stopAll([rumble, lp, rg, pops, hp, pg]);
    },
  },
  {
    id: 'wind', group: 'nature', icon: 'tree', label: { de: 'Wind', vi: 'Gió', en: 'Wind' },
    build: (ctx, out) => {
      const src = loop(ctx, noiseBuf(ctx, 'brown')), bp = filter(ctx, 'bandpass', 500, 0.8), g = gain(ctx, 0.6);
      const o1 = lfo(ctx, 0.07, 300, bp.frequency), o2 = lfo(ctx, 0.13, 0.35, g.gain);
      chain(src, bp, g, out);
      return stopAll([src, bp, g, o1, o2]);
    },
  },
  {
    id: 'ocean', group: 'nature', icon: 'raindrop', label: { de: 'Meer', vi: 'Biển', en: 'Ocean' },
    build: (ctx, out) => {
      const src = loop(ctx, noiseBuf(ctx, 'brown')), lp = filter(ctx, 'lowpass', 900), g = gain(ctx, 0.5);
      const o = lfo(ctx, 0.09, 0.45, g.gain);
      chain(src, lp, g, out);
      return stopAll([src, lp, g, o]);
    },
  },
  {
    id: 'tick', group: 'city', icon: 'clock', label: { de: 'Uhrticken', vi: 'Tiếng đồng hồ', en: 'Clock ticking' },
    build: (ctx, out) => {
      const src = ctx.createBufferSource();
      src.buffer = buffer(ctx, 'tick', tick);
      src.loop = true;
      src.start();
      const g = gain(ctx, 0.5);
      chain(src, g, out);
      return stopAll([src, g]);
    },
  },
  {
    id: 'typewriter', group: 'city', icon: 'tool_text', label: { de: 'Schreibmaschine', vi: 'Máy đánh chữ', en: 'Typewriter' },
    build: (ctx, out) => {
      const src = loop(ctx, buffer(ctx, 'typewriter', (sr) => typewriter(sr, SECONDS, mulberry32(17)))), hp = filter(ctx, 'highpass', 1500), g = gain(ctx, 0.6);
      chain(src, hp, g, out);
      return stopAll([src, hp, g]);
    },
  },
  ...(['white', 'pink', 'brown'] as const).map((kind): LayerDef => ({
    id: `${kind}-noise`, group: 'noise', icon: 'speaker',
    label: {
      white: { de: 'Weißes Rauschen', vi: 'Tiếng ồn trắng', en: 'White noise' },
      pink: { de: 'Rosa Rauschen', vi: 'Tiếng ồn hồng', en: 'Pink noise' },
      brown: { de: 'Braunes Rauschen', vi: 'Tiếng ồn nâu', en: 'Brown noise' },
    }[kind],
    build: (ctx, out) => {
      const src = loop(ctx, noiseBuf(ctx, kind)), g = gain(ctx, kind === 'white' ? 0.3 : kind === 'pink' ? 0.45 : 0.7);
      chain(src, g, out);
      return stopAll([src, g]);
    },
  })),
];

// Recorded CC0 loops from assets/manifest.json (available once `npm run assets:sync` has fetched them)
const RECORDED_LABELS: Record<string, Label> = {
  'forest-birds': { de: 'Wald & Vögel', vi: 'Rừng & chim hót', en: 'Forest birds' },
  thunderstorm: { de: 'Gewitter', vi: 'Giông bão', en: 'Thunderstorm' },
  cafe: { de: 'Café', vi: 'Quán cà phê', en: 'Café' },
  'ice-train': { de: 'ICE-Zugfahrt', vi: 'Tàu ICE', en: 'ICE train' },
  'berlin-ubahn': { de: 'Berliner U-Bahn', vi: 'Tàu điện ngầm Berlin', en: 'Berlin U-Bahn' },
  weihnachtsmarkt: { de: 'Weihnachtsmarkt', vi: 'Chợ Giáng sinh', en: 'Christmas market' },
  biergarten: { de: 'Biergarten', vi: 'Vườn bia', en: 'Beer garden' },
  'hanoi-street': { de: 'Straße in Hanoi', vi: 'Phố Hà Nội', en: 'Hanoi street' },
  'saigon-night-market': { de: 'Nachtmarkt Saigon', vi: 'Chợ đêm Sài Gòn', en: 'Saigon night market' },
  'rain-tin-roof': { de: 'Regen auf dem Blechdach', vi: 'Mưa mái tôn', en: 'Rain on a tin roof' },
  cicadas: { de: 'Zikaden', vi: 'Ve sầu mùa hè', en: 'Cicadas' },
  'vn-sidewalk-cafe': { de: 'Straßencafé Vietnam', vi: 'Cà phê vỉa hè', en: 'Vietnamese sidewalk café' },
};
const RECORDED_ICON: Record<string, SpriteName> = { 'hanoi-street': 'xe_may', 'saigon-night-market': 'non_la', 'vn-sidewalk-cafe': 'mug', cafe: 'mug', 'forest-birds': 'tree', 'rain-tin-roof': 'raindrop', thunderstorm: 'raindrop', 'berlin-ubahn': 'flag_de', 'ice-train': 'flag_de', weihnachtsmarkt: 'sparkle', biergarten: 'pretzel', cicadas: 'tree' };

const RECORDED: LayerDef[] = manifest.audio.map((a) => ({
  id: a.id,
  group: a.group as LayerDef['group'],
  icon: RECORDED_ICON[a.id] ?? 'music_note',
  label: RECORDED_LABELS[a.id] ?? { de: a.id, vi: a.id, en: a.id },
  url: '/' + a.dest.replace(/^public\//, ''),
}));

export const LAYERS: LayerDef[] = [...PROCEDURAL, ...RECORDED];
export const layerById = (id: string) => LAYERS.find((l) => l.id === id);

export interface Preset { id: string; label: Label; volumes: Record<string, number> }
export const PRESETS: Preset[] = [
  { id: 'rain-cafe', label: { de: 'Regen im Café', vi: 'Mưa ở quán cà phê', en: 'Rainy café' }, volumes: { rain: 0.6, cafe: 0.5, 'brown-noise': 0.15 } },
  { id: 'fireplace', label: { de: 'Kamin & Schnee', vi: 'Lò sưởi & tuyết', en: 'Fireplace & snow' }, volumes: { fire: 0.7, wind: 0.3 } },
  { id: 'hanoi', label: { de: 'Hanoi, 6 Uhr morgens', vi: 'Hà Nội 6 giờ sáng', en: 'Hanoi 6 AM' }, volumes: { 'hanoi-street': 0.5, 'rain-tin-roof': 0.4, rain: 0.25 } },
  { id: 'night-train', label: { de: 'Nachtzug nach Berlin', vi: 'Chuyến tàu đêm tới Berlin', en: 'Night train to Berlin' }, volumes: { 'ice-train': 0.6, 'brown-noise': 0.35, tick: 0.12 } },
  { id: 'ocean', label: { de: 'Ostsee', vi: 'Biển Baltic', en: 'Baltic sea' }, volumes: { ocean: 0.7, wind: 0.2 } },
  { id: 'focus', label: { de: 'Tiefer Fokus', vi: 'Tập trung sâu', en: 'Deep focus' }, volumes: { 'pink-noise': 0.35 } },
];
