#!/usr/bin/env node
// Builds pixel assets from text sources. Zero dependencies (Node >= 18).
//   assets/sprites/src/sprites.mjs  ->  public/assets/sprites/{<name>.png, atlas.png, atlas.json, preview.html}
//   procedural scenes               ->  public/assets/backgrounds/*.png
// Usage: node scripts/build-sprites.mjs [--check]   (--check validates only, writes nothing)

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const palette = JSON.parse(readFileSync(join(root, 'assets/palettes/pd17.json'), 'utf8')).colors;
const { sprites } = await import(pathToFileURL(join(root, 'assets/sprites/src/sprites.mjs')));

// ───────────────────────────── PNG encoder ─────────────────────────────
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** img: { w, h, data: Uint8Array RGBA } */
function encodePNG({ w, h, data }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    Buffer.from(data.buffer, data.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ───────────────────────────── image helpers ───────────────────────────
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const newImg = (w, h) => ({ w, h, data: new Uint8Array(w * h * 4) });
function setPx(img, x, y, rgb, a = 255) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
  const i = (y * img.w + x) * 4;
  img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = a;
}
function blit(dst, src, dx, dy) {
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const i = (y * src.w + x) * 4;
    if (src.data[i + 3]) setPx(dst, dx + x, dy + y, src.data.subarray(i, i + 3), src.data[i + 3]);
  }
}
const BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
/** ordered-dither between two colours: t in [0,1] */
const dither = (x, y, t, a, b) => (t * 16 > BAYER4[y & 3][x & 3] + 0.5 ? b : a);
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** vertical multi-stop gradient with ordered dithering between stops */
function ditherGradient(img, stops, y0 = 0, y1 = img.h) {
  const cols = stops.map(hex);
  for (let y = y0; y < y1; y++) {
    const t = ((y - y0) / (y1 - y0)) * (cols.length - 1);
    const i = Math.min(Math.floor(t), cols.length - 2);
    for (let x = 0; x < img.w; x++) setPx(img, x, y, dither(x, y, t - i, cols[i], cols[i + 1]));
  }
}
function disc(img, cx, cy, r, rgb) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.8) setPx(img, cx + x, cy + y, rgb);
}
function rect(img, x0, y0, w, h, rgb) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setPx(img, x, y, rgb);
}

// ───────────────────────────── sprites ─────────────────────────────────
const errors = [];
const frames = []; // { key, name, frame, img }
const PAL = Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, hex(v)]));

for (const [name, def] of Object.entries(sprites)) {
  def.frames.forEach((rows, fi) => {
    const w = rows[0].length, h = rows.length;
    rows.forEach((row, y) => {
      if (row.length !== w) errors.push(`${name}[${fi}] row ${y}: width ${row.length}, expected ${w}  "${row}"`);
      for (const ch of row) if (ch !== '.' && !PAL[ch]) errors.push(`${name}[${fi}] row ${y}: unknown palette key "${ch}"`);
    });
    if (def.frames[0].length !== h || def.frames[0][0].length !== w) errors.push(`${name}[${fi}]: frame size differs from frame 0`);
    const img = newImg(w, h);
    rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && PAL[ch] && setPx(img, x, y, PAL[ch])));
    frames.push({ key: def.frames.length > 1 ? `${name}_${fi}` : name, name, frame: fi, img });
  });
}

if (errors.length) {
  console.error(`✗ ${errors.length} sprite error(s):\n  ` + errors.join('\n  '));
  process.exit(1);
}
console.log(`✓ ${Object.keys(sprites).length} sprites, ${frames.length} frames validated`);
if (checkOnly) process.exit(0);

const outSprites = join(root, 'public/assets/sprites');
const outBg = join(root, 'public/assets/backgrounds');
mkdirSync(outSprites, { recursive: true });
mkdirSync(outBg, { recursive: true });

for (const f of frames) writeFileSync(join(outSprites, `${f.key}.png`), encodePNG(f.img));

// Atlas: simple shelf packing, tallest first, 1px padding.
const PAD = 1, ATLAS_W = 128;
const sorted = [...frames].sort((a, b) => b.img.h - a.img.h || b.img.w - a.img.w);
let cx = PAD, cy = PAD, shelfH = 0;
for (const f of sorted) {
  if (cx + f.img.w + PAD > ATLAS_W) { cx = PAD; cy += shelfH + PAD; shelfH = 0; }
  f.x = cx; f.y = cy; cx += f.img.w + PAD; shelfH = Math.max(shelfH, f.img.h);
}
const atlasH = 2 ** Math.ceil(Math.log2(cy + shelfH + PAD));
const atlas = newImg(ATLAS_W, atlasH);
for (const f of frames) blit(atlas, f.img, f.x, f.y);
writeFileSync(join(outSprites, 'atlas.png'), encodePNG(atlas));

const atlasJson = {
  meta: { image: 'atlas.png', size: { w: ATLAS_W, h: atlasH }, palette: 'pd17', generator: 'scripts/build-sprites.mjs' },
  frames: Object.fromEntries(frames.map((f) => [f.key, { x: f.x, y: f.y, w: f.img.w, h: f.img.h }])),
  sprites: Object.fromEntries(Object.entries(sprites).map(([name, d]) => [name, {
    frames: d.frames.length > 1 ? d.frames.map((_, i) => `${name}_${i}`) : [name],
    tags: d.tags ?? [], fps: d.fps ?? 0, ...(d.slice ? { slice: d.slice } : {}),
  }])),
};
writeFileSync(join(outSprites, 'atlas.json'), JSON.stringify(atlasJson, null, 2));

// ───────────────────────────── procedural backgrounds (320×180) ────────
function berlinNight() {
  const W = 320, H = 180, img = newImg(W, H), rnd = mulberry32(1989);
  ditherGradient(img, ['#07061a', '#120f33', '#231a55', '#3a2470', '#6a3490', '#7a3a98'], 0, H);
  // stars
  for (let i = 0; i < 140; i++) {
    const x = rnd() * W, y = rnd() * 110, c = rnd() < 0.2 ? hex('#ffd23f') : hex('#f4efe6');
    setPx(img, x, y, c);
    if (rnd() < 0.06) { setPx(img, x - 1, y, c); setPx(img, x + 1, y, c); setPx(img, x, y - 1, c); setPx(img, x, y + 1, c); }
  }
  // moon with a soft dithered halo
  const halo = hex('#4c2a9e');
  for (let y = -26; y <= 26; y++) for (let x = -26; x <= 26; x++) {
    const d = Math.hypot(x, y);
    if (d > 13 && d < 26 && dither(60 + x, 38 + y, (26 - d) / 26, [0, 0, 0], halo) === halo) setPx(img, 60 + x, 38 + y, halo);
  }
  disc(img, 60, 38, 12, hex('#f4efe6'));
  [[56, 34, 2], [64, 42, 3], [62, 33, 1]].forEach(([x, y, r]) => disc(img, x, y, r, hex('#d8d0c4')));
  // far skyline
  const far = hex('#1b1540');
  for (let x = 0; x < W;) { const w = 6 + (rnd() * 18) | 0, h = 25 + (rnd() * 40) | 0; rect(img, x, H - h, w, h, far); x += w; }
  // Fernsehturm (Berlin TV tower)
  const tower = hex('#120e30'), tx = 236;
  for (let y = 26; y < 62; y++) setPx(img, tx, y, tower);
  setPx(img, tx, 25, hex('#e0344a'));
  disc(img, tx, 70, 8, tower);
  rect(img, tx - 3, 78, 7, 2, tower);
  for (let y = 80; y < H; y++) { const half = 1 + ((y - 80) / 40) | 0; rect(img, tx - half, y, half * 2 + 1, 1, tower); }
  // near skyline with lit windows
  const near = hex('#0d0b1e'), warm = [hex('#ffd23f'), hex('#ff8a2a'), hex('#3fd0ff')];
  for (let x = 0; x < W;) {
    const w = 10 + (rnd() * 22) | 0, h = 14 + (rnd() * 34) | 0;
    rect(img, x, H - h, w, h, near);
    for (let wy = H - h + 3; wy < H - 3; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 3)
      if (rnd() < 0.28) setPx(img, wx, wy, warm[rnd() < 0.8 ? 0 : rnd() < 0.5 ? 1 : 2]);
    x += w + ((rnd() * 3) | 0);
  }
  return img;
}

function aquarium() {
  const W = 320, H = 180, img = newImg(W, H), rnd = mulberry32(7);
  ditherGradient(img, ['#0f2a8e', '#1f5fe0', '#2a7ff0', '#1a4fc0', '#0a1a4a'], 0, 150);
  // light rays
  const ray = hex('#5fc8ff');
  for (let y = 0; y < 130; y++) for (let x = 0; x < W; x++) {
    const band = (x + y * 0.45) % 46;
    if (band < 9 && dither(x, y, 0.35 * (1 - y / 130), [0, 0, 0], ray) === ray) setPx(img, x, y, ray);
  }
  // seaweed
  const weeds = [hex('#1a3fa8'), hex('#2a5fd0'), hex('#0f2f80')];
  for (let i = 0; i < 26; i++) {
    const bx = rnd() * W, h = 25 + rnd() * 60, ph = rnd() * 6, c = weeds[i % 3];
    for (let y = 0; y < h; y++) { const x = bx + Math.sin(y / 6 + ph) * 2.5; setPx(img, x, 150 - y, c); setPx(img, x + 1, 150 - y, c); }
  }
  // fish silhouettes
  const fish = hex('#0a2266');
  for (let i = 0; i < 7; i++) {
    const fx = (rnd() * (W - 20)) | 0, fy = 40 + (rnd() * 80) | 0, dir = rnd() < 0.5 ? 1 : -1;
    for (let x = 0; x < 9; x++) { const t = 1 - Math.abs(x - 4) / 5; rect(img, fx + x * dir, fy - Math.round(t * 1.5), 1, 1 + Math.round(t * 3), fish); }
    rect(img, fx + 9 * dir, fy - 1, 1, 3, fish);
  }
  // bubbles
  const bub = hex('#bfefff');
  for (let i = 0; i < 40; i++) {
    const x = rnd() * W, y = rnd() * 145, r = rnd() < 0.8 ? 0 : 2;
    if (!r) { setPx(img, x, y, bub); continue; }
    for (let a = 0; a < 16; a++) setPx(img, x + Math.round(Math.cos(a / 16 * 6.283) * r), y + Math.round(Math.sin(a / 16 * 6.283) * r), bub);
  }
  // bar counter + bottles
  rect(img, 0, 150, W, 30, hex('#0d0b1e'));
  rect(img, 0, 150, W, 1, hex('#3fd0ff'));
  rect(img, 0, 151, W, 1, hex('#1f4fd1'));
  const glass = [hex('#0a1a4a'), hex('#1b1540'), hex('#122a5a')];
  for (let i = 0; i < 12; i++) {
    const bx = 10 + (rnd() * 300) | 0, bh = 8 + (rnd() * 10) | 0, c = glass[i % 3];
    rect(img, bx, 150 - bh, 4, bh, c); rect(img, bx + 1, 150 - bh - 4, 2, 4, c);
    setPx(img, bx + 1, 150 - bh + 2, hex('#3fd0ff'));
  }
  // hanging bulbs with dithered glow
  const cord = hex('#0d0b1e'), bulb = hex('#ffd23f'), glow = hex('#ffe9a0');
  [40, 130, 250].forEach((bx, i) => {
    const len = 14 + i * 6;
    for (let y = 0; y < len; y++) setPx(img, bx, y, cord);
    for (let y = -10; y <= 10; y++) for (let x = -10; x <= 10; x++) {
      const d = Math.hypot(x, y);
      if (d < 10 && dither(bx + x, len + 3 + y, (10 - d) / 14, [0, 0, 0], glow) === glow) setPx(img, bx + x, len + 3 + y, glow);
    }
    rect(img, bx - 1, len, 3, 5, bulb); setPx(img, bx, len + 5, bulb);
  });
  return img;
}

const scenes = { 'berlin-night': berlinNight(), aquarium: aquarium() };
for (const [n, img] of Object.entries(scenes)) writeFileSync(join(outBg, `${n}.png`), encodePNG(img));

// ───────────────────────────── contact sheet ───────────────────────────
const cards = Object.entries(atlasJson.sprites).map(([name, s]) => `
  <figure class="card"><div class="stage">${s.frames.map((k, i) =>
    `<img src="${k}.png" style="--w:${atlasJson.frames[k].w};--h:${atlasJson.frames[k].h}" ${i ? 'class="alt"' : ''}>`).join('')}</div>
  <figcaption>${name}<small>${s.tags.join(' · ')}${s.fps ? ` · ${s.frames.length}f@${s.fps}fps` : ''}</small></figcaption></figure>`).join('');
writeFileSync(join(outSprites, 'preview.html'), `<!doctype html><meta charset="utf-8"><title>Lernzimmer sprites</title>
<style>
  body{background:#0d0b1e;color:#f4efe6;font:14px/1.3 monospace;margin:24px}
  h1{color:#8b5cf6;font-size:18px} h2{color:#3fd0ff;font-size:14px;margin-top:28px}
  .grid{display:flex;flex-wrap:wrap;gap:12px}
  .card{margin:0;background:#141028;border:2px solid #4c2a9e;padding:10px;width:120px;text-align:center}
  .stage{height:72px;display:flex;align-items:center;justify-content:center;gap:6px;background:
    repeating-conic-gradient(#1b1540 0 25%,#141028 0 50%) 0 0/8px 8px}
  img{image-rendering:pixelated;width:calc(var(--w)*4px);height:calc(var(--h)*4px)}
  .stage img.alt{display:none} .stage:hover img{display:none} .stage:hover img.alt{display:block}
  .stage:hover img:only-child{display:block}
  figcaption{margin-top:6px} small{display:block;color:#8b8aa3;font-size:11px}
  .bg img{width:640px;height:360px;border:2px solid #4c2a9e;margin-right:12px}
</style>
<h1>♥ Lernzimmer — sprite contact sheet</h1>
<p>Generated by scripts/build-sprites.mjs · shown at 4× · hover to see frame 2</p>
<div class="grid">${cards}</div>
<h2>atlas.png</h2><img src="atlas.png" style="width:${ATLAS_W * 3}px;height:${atlasH * 3}px;image-rendering:pixelated;background:#222">
<h2>backgrounds (320×180, shown 2×)</h2><div class="bg">${Object.keys(scenes).map((n) => `<img src="../backgrounds/${n}.png">`).join('')}</div>`);

console.log(`✓ wrote ${frames.length} PNGs, atlas ${ATLAS_W}×${atlasH}, ${Object.keys(scenes).length} backgrounds, preview.html`);
