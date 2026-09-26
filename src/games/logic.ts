// Pure game logic for the arcade (no DOM, no timers) so it can be unit-tested.
import { isNew, State, type Card } from '../learn/cards';
import type { Gender } from '../learn/words';

export type Rng = () => number;

// ───────────────────────────── word selection ─────────────────────────────

/**
 * Pick up to n cards, preferring what the learner needs: due/learning cards and cards
 * with lapses weigh more; not-yet-due and new cards still appear for variety.
 */
export function pickCards(cards: Card[], n: number, now: Date, rnd: Rng = Math.random): Card[] {
  const t = now.getTime();
  const weight = (c: Card) => {
    if (isNew(c)) return 1;
    const due = new Date(c.srs.due).getTime() <= t || c.srs.state === State.Learning || c.srs.state === State.Relearning;
    return (due ? 3 : 1) + Math.min(c.srs.lapses, 3);
  };
  const pool = cards.map((c) => ({ c, w: weight(c) }));
  const out: Card[] = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let r = rnd() * total, i = 0;
    while (i < pool.length - 1 && (r -= pool[i].w) > 0) i++;
    out.push(pool.splice(i, 1)[0].c);
  }
  return out;
}

export function shuffle<T>(xs: T[], rnd: Rng = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ───────────────────────────── Artikel-Regen ─────────────────────────────

export const ARTIKEL_LIVES = 3;
/** Seconds a word takes to fall; gets faster per level but never below 2 s. */
export const fallTime = (level: number) => Math.max(2, 6.5 - 0.45 * (level - 1));
/** Level rises every 5 correct answers. */
export const levelFor = (correct: number) => 1 + Math.floor(correct / 5);
/** Base 10 points, a streak bonus every 5 in a row, and more for higher levels. */
export const pointsFor = (streak: number, level: number) => 10 * (1 + Math.floor(streak / 5)) + 2 * (level - 1);

export interface ArtikelState { score: number; lives: number; correct: number; streak: number; best: number; over: boolean }
export const artikelStart = (): ArtikelState => ({ score: 0, lives: ARTIKEL_LIVES, correct: 0, streak: 0, best: 0, over: false });

/** Answer (or a word hitting the ground: pass `undefined`). */
export function artikelAnswer(s: ArtikelState, answer: Gender | undefined, actual: Gender): ArtikelState {
  if (s.over) return s;
  if (answer === actual) {
    const streak = s.streak + 1;
    return { ...s, score: s.score + pointsFor(streak, levelFor(s.correct)), correct: s.correct + 1, streak, best: Math.max(s.best, streak) };
  }
  const lives = s.lives - 1;
  return { ...s, lives, streak: 0, over: lives <= 0 };
}

// ───────────────────────────── Memory ─────────────────────────────

export interface Tile { id: number; pair: string; side: 'de' | 'meaning'; text: string; gender?: Gender }
export interface MemoryState { tiles: Tile[]; up: number[]; matched: Set<string>; moves: number; locked: boolean }

export function memoryDeal(pairs: { id: string; de: string; gender?: Gender; meaning: string }[], rnd: Rng = Math.random): MemoryState {
  const tiles = shuffle(pairs.flatMap((p) => [
    { pair: p.id, side: 'de' as const, text: p.gender ? `${p.gender} ${p.de}` : p.de, gender: p.gender },
    { pair: p.id, side: 'meaning' as const, text: p.meaning },
  ]), rnd).map((t, id) => ({ ...t, id }));
  return { tiles, up: [], matched: new Set(), moves: 0, locked: false };
}

/** Flip a tile. A second flip counts a move; a mismatch locks until `memoryHide`. */
export function memoryFlip(s: MemoryState, id: number): { state: MemoryState; result?: 'match' | 'miss'; pair?: string } {
  const tile = s.tiles[id];
  if (!tile || s.locked || s.matched.has(tile.pair) || s.up.includes(id)) return { state: s };
  if (s.up.length === 0) return { state: { ...s, up: [id] } };
  const first = s.tiles[s.up[0]];
  const moves = s.moves + 1;
  if (first.pair === tile.pair) {
    const matched = new Set(s.matched).add(tile.pair);
    return { state: { ...s, up: [], matched, moves }, result: 'match', pair: tile.pair };
  }
  return { state: { ...s, up: [s.up[0], id], moves, locked: true }, result: 'miss', pair: first.pair };
}

export const memoryHide = (s: MemoryState): MemoryState => ({ ...s, up: [], locked: false });
export const memoryDone = (s: MemoryState) => s.matched.size * 2 === s.tiles.length;

// ───────────────────────────── Zahlen-Sprint ─────────────────────────────

export const ZAHLEN_LEVELS = [
  { id: 1, min: 0, max: 20 },
  { id: 2, min: 21, max: 100 },
  { id: 3, min: 101, max: 999 },
  { id: 4, min: 1950, max: 2030, year: true },
] as const;
export type ZahlenLevel = (typeof ZAHLEN_LEVELS)[number];
export const ZAHLEN_SECONDS = 60;

export const makeNumber = (level: ZahlenLevel, rnd: Rng = Math.random, avoid?: number) => {
  let n: number;
  do n = level.min + Math.floor(rnd() * (level.max - level.min + 1)); while (n === avoid && level.max > level.min);
  return n;
};

/** Accept "97", " 97 ", "1.980" / "1 980" style separators. */
export const checkNumber = (input: string, n: number) => {
  const digits = input.trim().replace(/[.\s,']/g, '');
  return /^\d+$/.test(digits) && Number(digits) === n;
};
