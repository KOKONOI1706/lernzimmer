import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS, addStats, advanceQuests, EMPTY_STATS, feed, foodAt, levelInfo, liveStreak, moodOf, questsFor,
  rewardFor, touchStreak, weekOf, xpForLevel, type Pet, type Quest, type Streak,
} from './rules';

describe('levels', () => {
  it('grows thresholds and names levels after CEFR', () => {
    expect([0, 1, 2, 3].map(xpForLevel)).toEqual([0, 100, 300, 600]);
    expect(levelInfo(0)).toMatchObject({ index: 0, name: 'A1.1', progress: 0 });
    expect(levelInfo(150)).toMatchObject({ index: 1, name: 'A1.2', into: 50, needed: 200 });
    expect(levelInfo(xpForLevel(5)).name).toBe('A2.1');
    expect(levelInfo(xpForLevel(30)).name).toBe('C1.5 ★6');
  });

  it('rewards real reviews more than game practice', () => {
    expect(rewardFor({ type: 'review', correct: true, wasNew: false, practice: false }).xp).toBe(10);
    expect(rewardFor({ type: 'review', correct: true, wasNew: false, practice: true }).xp).toBe(3);
    expect(rewardFor({ type: 'gameEnd', game: 'artikel', score: 9999 }).xp).toBe(35); // capped
  });
});

describe('streak', () => {
  const s = (over: Partial<Streak> = {}): Streak => ({ current: 4, best: 6, lastDay: '2026-09-25', freezes: 0, ...over });
  it('continues on consecutive days and ignores repeats on the same day', () => {
    expect(touchStreak(s(), '2026-09-26').streak).toMatchObject({ current: 5, best: 6, lastDay: '2026-09-26' });
    expect(touchStreak(s(), '2026-09-25').streak.current).toBe(4);
  });
  it('bridges missed days with freezes, otherwise restarts', () => {
    expect(touchStreak(s({ freezes: 2 }), '2026-09-28')).toMatchObject({ streak: { current: 5, freezes: 0 }, usedFreezes: 2 });
    expect(touchStreak(s({ freezes: 1 }), '2026-09-28').streak).toMatchObject({ current: 1, freezes: 1, best: 6 });
    expect(touchStreak({ current: 0, best: 0, freezes: 0 }, '2026-09-26').streak.current).toBe(1);
  });
  it('shows 0 when the streak is already broken', () => {
    expect(liveStreak(s(), '2026-09-26')).toBe(4); // today not yet studied, still alive
    expect(liveStreak(s(), '2026-09-27')).toBe(0);
    expect(liveStreak(s({ freezes: 1 }), '2026-09-27')).toBe(4);
  });
});

describe('pet', () => {
  const t0 = new Date(2026, 8, 26, 12).getTime();
  const pet: Pet = { name: 'Brezel', food: 80, updatedAt: t0 };
  it('gets hungry over time but never below 0, and feeding caps at 100', () => {
    expect(foodAt(pet, t0 + 86_400_000)).toBeCloseTo(50);
    expect(foodAt(pet, t0 + 10 * 86_400_000)).toBe(0);
    expect(feed(pet, 50, t0).food).toBe(100);
  });
  it('mood follows food, and he sleeps at night', () => {
    expect(moodOf(pet, t0)).toBe('happy');
    expect(moodOf({ ...pet, food: 40 }, t0)).toBe('ok');
    expect(moodOf({ ...pet, food: 10 }, t0)).toBe('hungry');
    expect(moodOf(pet, new Date(2026, 8, 26, 23, 30).getTime())).toBe('sleepy');
  });
});

describe('quests', () => {
  it('are three different, stable per day, and change between days', () => {
    const a = questsFor('2026-09-26');
    expect(a).toHaveLength(3);
    expect(new Set(a.map((q) => q.type)).size).toBe(3);
    expect(questsFor('2026-09-26')).toEqual(a);
    expect(questsFor('2026-09-27').map((q) => q.id)).not.toEqual(a.map((q) => q.id));
  });
  it('advance with matching events and stop at the target', () => {
    let qs: Quest[] = [
      { id: 'r', type: 'reviews', target: 2, progress: 0, claimed: false },
      { id: 'a', type: 'artikel', target: 100, progress: 0, claimed: false },
    ];
    const review = { type: 'review' as const, correct: true, wasNew: false, practice: false };
    qs = advanceQuests(advanceQuests(advanceQuests(qs, review), review), review);
    qs = advanceQuests(qs, { type: 'gameEnd', game: 'artikel', score: 80 });
    qs = advanceQuests(qs, { type: 'gameEnd', game: 'artikel', score: 40 });
    expect(qs.map((q) => q.progress)).toEqual([2, 80]);
    // practice answers don't count as reviews
    expect(advanceQuests([{ ...qs[0], progress: 0 }], { ...review, practice: true })[0].progress).toBe(0);
  });
});

describe('achievements & weeks', () => {
  it('unlock from stats and context', () => {
    const stats = addStats(addStats(EMPTY_STATS, { type: 'review', correct: true, wasNew: true, practice: false }), { type: 'gameEnd', game: 'artikel', score: 320 });
    const unlocked = ACHIEVEMENTS.filter((a) => a.check(stats, { streakBest: 7, level: 0 })).map((a) => a.id);
    expect(unlocked).toEqual(['first-review', 'streak-7', 'artikel-300']);
  });
  it('weeks start on Monday', () => {
    expect(weekOf('2026-09-26')).toBe('2026-09-21'); // Saturday → Monday
    expect(weekOf('2026-09-21')).toBe('2026-09-21');
    expect(weekOf('2026-09-27')).toBe('2026-09-21'); // Sunday belongs to the same week
  });
});
