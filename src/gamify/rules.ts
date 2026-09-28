// Gamification rules as pure functions (no store, no clock) so they're easy to test and tune.
import { mulberry32 } from '../audio/noise';
import { addDays, daysBetween, type IsoDate } from '../calendar/dates';
import type { StudyEvent } from './events';

// ───────────────────────────── XP & levels ─────────────────────────────

/** CEFR-flavoured level names: A1.1 … C1.5 (25 levels), then "C1.5 ★n". */
export const LEVEL_NAMES = ['A1', 'A2', 'B1', 'B2', 'C1'].flatMap((l) => [1, 2, 3, 4, 5].map((n) => `${l}.${n}`));

/** Total XP needed to reach level index n (0-based): 0, 100, 300, 600, 1000, … */
export const xpForLevel = (n: number) => 50 * n * (n + 1);

export function levelInfo(xp: number) {
  let n = 0;
  while (xpForLevel(n + 1) <= xp) n++;
  const from = xpForLevel(n), to = xpForLevel(n + 1);
  const name = n < LEVEL_NAMES.length ? LEVEL_NAMES[n] : `${LEVEL_NAMES[LEVEL_NAMES.length - 1]} ★${n - LEVEL_NAMES.length + 1}`;
  return { index: n, name, progress: (xp - from) / (to - from), into: xp - from, needed: to - from };
}

/** XP and coins for one event. */
export function rewardFor(e: StudyEvent): { xp: number; coins: number } {
  switch (e.type) {
    case 'review': return e.practice ? { xp: e.correct ? 3 : 1, coins: 0 } : { xp: e.correct ? 10 : 4, coins: 0 };
    case 'focusDone': return { xp: 25, coins: 5 };
    case 'gameEnd': return { xp: 5 + Math.min(30, Math.floor(e.score / 10)), coins: 2 };
    case 'cardCreated': return { xp: 5 * Math.min(e.count, 10), coins: 0 };
    case 'boardCard': return { xp: 5, coins: 1 };
    case 'bossWin': return { xp: 150, coins: 50 };
  }
}
export const LEVEL_UP_COINS = 20;

// ───────────────────────────── streak ─────────────────────────────

export interface Streak { current: number; best: number; lastDay?: IsoDate; freezes: number }
export const MAX_FREEZES = 3;

/**
 * Register study activity on `today`. Missed days are bridged with freezes if there are enough;
 * otherwise the streak starts again at 1.
 */
export function touchStreak(s: Streak, today: IsoDate): { streak: Streak; usedFreezes: number } {
  if (s.lastDay === today) return { streak: s, usedFreezes: 0 };
  const gap = s.lastDay ? daysBetween(s.lastDay, today) : Infinity;
  if (gap < 0) return { streak: s, usedFreezes: 0 }; // clock went backwards: ignore
  let current = 1, used = 0;
  if (gap === 1) current = s.current + 1;
  else if (Number.isFinite(gap) && gap - 1 <= s.freezes) { used = gap - 1; current = s.current + 1; }
  return { streak: { current, best: Math.max(s.best, current), lastDay: today, freezes: s.freezes - used }, usedFreezes: used };
}

/** Streak as it should be displayed today (0 if a day was missed and not covered by freezes). */
export function liveStreak(s: Streak, today: IsoDate): number {
  if (!s.lastDay) return 0;
  const gap = daysBetween(s.lastDay, today);
  return gap <= 1 || gap - 1 <= s.freezes ? s.current : 0;
}

// ───────────────────────────── pet ─────────────────────────────

export interface Pet { name: string; food: number; updatedAt: number; hat?: string }
export const FOOD_MAX = 100;
const DECAY_PER_DAY = 30;

/** Food left at time t (goes down smoothly, ~30/day). Brezel never dies, he just gets hungry. */
export const foodAt = (p: Pet, t: number) => Math.max(0, p.food - (DECAY_PER_DAY * Math.max(0, t - p.updatedAt)) / 86_400_000);

export const foodFor = (e: StudyEvent) =>
  e.type === 'review' ? (e.correct ? 3 : 1) : e.type === 'focusDone' ? 12 : e.type === 'gameEnd' ? 6 : e.type === 'bossWin' ? 30 : 2;

export function feed(p: Pet, amount: number, t: number): Pet {
  return { ...p, food: Math.min(FOOD_MAX, foodAt(p, t) + amount), updatedAt: t };
}

export type Mood = 'happy' | 'ok' | 'hungry' | 'sleepy';
export function moodOf(p: Pet, t: number): Mood {
  const h = new Date(t).getHours();
  if (h >= 23 || h < 6) return 'sleepy';
  const f = foodAt(p, t);
  return f >= 60 ? 'happy' : f >= 25 ? 'ok' : 'hungry';
}

// ───────────────────────────── daily quests ─────────────────────────────

export type QuestType = 'reviews' | 'newCards' | 'focus' | 'games' | 'artikel' | 'boardCard' | 'correct';
export interface Quest { id: string; type: QuestType; target: number; progress: number; claimed: boolean }
export const QUEST_REWARD = { xp: 30, coins: 15 };

const POOL: { type: QuestType; targets: number[] }[] = [
  { type: 'reviews', targets: [10, 20, 30] },
  { type: 'correct', targets: [10, 15] },
  { type: 'newCards', targets: [3, 5] },
  { type: 'focus', targets: [1, 2] },
  { type: 'games', targets: [1, 2] },
  { type: 'artikel', targets: [100, 200] },
  { type: 'boardCard', targets: [1] },
];

/** Three different quests per day, the same for everyone on that date (seeded). */
export function questsFor(day: IsoDate): Quest[] {
  const rnd = mulberry32(Number(day.replace(/-/g, '')));
  const pool = [...POOL];
  const out: Quest[] = [];
  while (out.length < 3) {
    const [q] = pool.splice(Math.floor(rnd() * pool.length), 1);
    out.push({ id: `${day}:${q.type}`, type: q.type, target: q.targets[Math.floor(rnd() * q.targets.length)], progress: 0, claimed: false });
  }
  return out;
}

/** How much an event advances a quest of the given type. */
export function questProgress(type: QuestType, e: StudyEvent): number {
  switch (type) {
    case 'reviews': return e.type === 'review' && !e.practice ? 1 : 0;
    case 'correct': return e.type === 'review' && e.correct ? 1 : 0;
    case 'newCards': return e.type === 'review' && e.wasNew ? 1 : 0;
    case 'focus': return e.type === 'focusDone' ? 1 : 0;
    case 'games': return e.type === 'gameEnd' ? 1 : 0;
    case 'boardCard': return e.type === 'boardCard' ? 1 : 0;
    case 'artikel': return 0; // best score, handled as a max below
  }
}

export function advanceQuests(qs: Quest[], e: StudyEvent): Quest[] {
  return qs.map((q) => {
    if (q.claimed || q.progress >= q.target) return q;
    const progress = q.type === 'artikel'
      ? (e.type === 'gameEnd' && e.game === 'artikel' ? Math.max(q.progress, e.score) : q.progress)
      : q.progress + questProgress(q.type, e);
    return { ...q, progress: Math.min(q.target, progress) };
  });
}

// ───────────────────────────── achievements ─────────────────────────────

export interface Stats { reviews: number; correct: number; focus: number; games: number; cards: number; bossWins: number; artikelBest: number }
export const EMPTY_STATS: Stats = { reviews: 0, correct: 0, focus: 0, games: 0, cards: 0, bossWins: 0, artikelBest: 0 };

export function addStats(s: Stats, e: StudyEvent): Stats {
  switch (e.type) {
    case 'review': return { ...s, reviews: s.reviews + 1, correct: s.correct + (e.correct ? 1 : 0) };
    case 'focusDone': return { ...s, focus: s.focus + 1 };
    case 'gameEnd': return { ...s, games: s.games + 1, artikelBest: e.game === 'artikel' ? Math.max(s.artikelBest, e.score) : s.artikelBest };
    case 'cardCreated': return { ...s, cards: s.cards + e.count };
    case 'bossWin': return { ...s, bossWins: s.bossWins + 1 };
    default: return s;
  }
}

export interface Achievement { id: string; icon: string; check: (s: Stats, ctx: { streakBest: number; level: number }) => boolean }
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-review', icon: 'book', check: (s) => s.reviews >= 1 },
  { id: 'reviews-100', icon: 'book', check: (s) => s.reviews >= 100 },
  { id: 'reviews-1000', icon: 'book', check: (s) => s.reviews >= 1000 },
  { id: 'focus-10', icon: 'tomato', check: (s) => s.focus >= 10 },
  { id: 'streak-7', icon: 'fire', check: (_s, c) => c.streakBest >= 7 },
  { id: 'streak-30', icon: 'fire', check: (_s, c) => c.streakBest >= 30 },
  { id: 'artikel-300', icon: 'raindrop', check: (s) => s.artikelBest >= 300 },
  { id: 'cards-50', icon: 'sticky_note', check: (s) => s.cards >= 50 },
  { id: 'boss-1', icon: 'sparkle', check: (s) => s.bossWins >= 1 },
  { id: 'level-a2', icon: 'heart', check: (_s, c) => c.level >= 5 },
];

// ───────────────────────────── boss week ─────────────────────────────

/** Monday of the week containing `day` (the boss can be beaten once per week). */
export function weekOf(day: IsoDate): IsoDate {
  const [y, m, d] = day.split('-').map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return addDays(day, -dow);
}
