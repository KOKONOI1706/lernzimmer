#!/usr/bin/env node
// Syncs external assets listed in assets/manifest.json. Zero dependencies (Node >= 18).
//
//   node scripts/sync-assets.mjs                 download missing assets, verify against lock
//   node scripts/sync-assets.mjs --dry           show what would happen
//   node scripts/sync-assets.mjs --only=cafe     single entry
//   node scripts/sync-assets.mjs --search "rain on tin roof"   list CC0 candidates on Freesound
//
// Freesound needs a free API key: https://freesound.org/apiv2/apply  ->  FREESOUND_API_KEY=... in .env
// Only CC0 sounds are accepted (license is re-checked at download time), so no attribution is needed.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.find((a) => a === `--${n}` || a.startsWith(`--${n}=`));
const dry = !!flag('dry');
const only = flag('only')?.split('=')[1];

// minimal .env loader
const envFile = join(root, '.env');
if (existsSync(envFile)) for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const KEY = process.env.FREESOUND_API_KEY;
const API = 'https://freesound.org/apiv2';

const manifestPath = join(root, 'assets/manifest.json');
const lockPath = join(root, 'assets/manifest.lock.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const lock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) : { version: 1, entries: {} };
const allowed = new Set(manifest.allowedLicenses);
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

async function fsJson(path) {
  if (!KEY) throw new Error('FREESOUND_API_KEY missing (see header of this script)');
  const res = await fetch(`${API}${path}${path.includes('?') ? '&' : '?'}token=${KEY}`);
  if (!res.ok) throw new Error(`Freesound ${res.status} for ${path}`);
  return res.json();
}

// ── search mode ──
const searchIdx = args.indexOf('--search');
if (searchIdx !== -1) {
  const q = args[searchIdx + 1];
  if (!q) { console.error('usage: --search "<query>"'); process.exit(1); }
  const data = await fsJson(`/search/text/?query=${encodeURIComponent(q)}&filter=${encodeURIComponent('license:"Creative Commons 0" duration:[20 TO 600]')}&fields=id,name,duration,username,avg_rating,num_downloads&sort=rating_desc&page_size=15`);
  console.log(`CC0 results for "${q}" (${data.count} total):\n`);
  for (const s of data.results) console.log(`  ${String(s.id).padEnd(8)} ${s.duration.toFixed(0).padStart(4)}s  ★${(s.avg_rating ?? 0).toFixed(1)}  ⬇${s.num_downloads}  ${s.name}  — ${s.username}\n           https://freesound.org/s/${s.id}/`);
  process.exit(0);
}

// ── sync mode ──
let ok = 0, skipped = 0, failed = 0;
const note = (sym, id, msg) => console.log(`${sym} ${id.padEnd(22)} ${msg}`);

for (const a of manifest.audio) {
  if (only && a.id !== only) continue;
  const dest = join(root, a.dest);
  const locked = lock.entries[a.id];

  if (a.freesound == null) { note('·', a.id, `not curated yet → npm run assets:search -- "${a.query}"`); skipped++; continue; }
  if (existsSync(dest) && locked?.sha256 === sha256(readFileSync(dest)) && locked.source === `freesound:${a.freesound}`) {
    note('✓', a.id, 'up to date'); ok++; continue;
  }
  if (dry) { note('→', a.id, `would download freesound:${a.freesound} → ${a.dest}`); continue; }

  try {
    const s = await fsJson(`/sounds/${a.freesound}/?fields=id,name,license,username,previews,url`);
    if (!allowed.has(s.license)) throw new Error(`license not allowed: ${s.license}`);
    const res = await fetch(s.previews['preview-hq-mp3']);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
    lock.entries[a.id] = { source: `freesound:${s.id}`, name: s.name, author: s.username, url: s.url, license: s.license,
      sha256: sha256(buf), bytes: buf.length, syncedAt: new Date().toISOString() };
    note('⬇', a.id, `${(buf.length / 1024).toFixed(0)} KB  "${s.name}" by ${s.username}`); ok++;
  } catch (e) { note('✗', a.id, e.message); failed++; }
}

for (const p of manifest.packs) {
  if (only && p.id !== only) continue;
  note('!', p.id, `manual: download from ${p.page} (${p.license}) → ${p.dest}`);
}
console.log(`\nfonts: installed via npm (${manifest.fonts.map((f) => f.npm).join(', ')})`);
console.log(`procedural (no files): ${manifest.procedural.join(', ')}`);

if (!dry) writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
console.log(`\n${ok} ok · ${skipped} not curated · ${failed} failed`);
process.exit(failed ? 1 : 0);
