import { beforeEach, describe, expect, it } from 'vitest';
import { newProfile, setCelebrationHandler, useProfile, type Celebration } from './store';
import { emit } from './events';
import { xpForLevel } from './rules';

const P = () => useProfile.getState();
const T = new Date(2026, 8, 26, 12).getTime();
const review = { type: 'review' as const, correct: true, wasNew: true, practice: false };

beforeEach(() => useProfile.setState(newProfile(T)));

describe('profile', () => {
  it('a review gives XP, starts the streak, feeds Brezel and advances quests', () => {
    const food = P().pet.food;
    useProfile.setState({ quests: { day: '2026-09-26', list: [{ id: 'q', type: 'reviews', target: 2, progress: 0, claimed: false }] } });
    P().handle(review, T);
    expect(P().xp).toBe(10);
    expect(P().streak).toMatchObject({ current: 1, lastDay: '2026-09-26' });
    expect(P().pet.food).toBeGreaterThan(food);
    expect(P().quests.list[0].progress).toBe(1);
    expect(P().stats.reviews).toBe(1);
  });

  it('celebrates level-ups (with bonus coins) and first achievements via the event bus', () => {
    const seen: Celebration[] = [];
    setCelebrationHandler((c) => seen.push(...c));
    useProfile.setState({ xp: xpForLevel(1) - 5 });
    emit(review, T);
    expect(seen).toEqual([{ kind: 'level', name: 'A1.2' }, { kind: 'achievement', id: 'first-review' }]);
    expect(P().coins).toBe(20);
    emit(review, T);
    expect(seen).toHaveLength(2); // nothing new the second time
  });

  it('claims finished quests once', () => {
    useProfile.setState({ quests: { day: '2026-09-26', list: [{ id: 'q', type: 'focus', target: 1, progress: 1, claimed: false }, { id: 'n', type: 'games', target: 1, progress: 0, claimed: false }] } });
    P().claimQuest('q', T);
    expect(P()).toMatchObject({ xp: 30, coins: 15 });
    P().claimQuest('q', T);
    P().claimQuest('n', T); // not finished
    expect(P()).toMatchObject({ xp: 30, coins: 15 });
  });

  it('refreshes quests on a new day', () => {
    P().handle(review, new Date(2026, 8, 27, 9).getTime());
    expect(P().quests.day).toBe('2026-09-27');
    expect(P().streak.current).toBe(1);
  });

  it('shop: coins are checked, freezes capped at 3, hats bought once and worn', () => {
    expect(P().buy('freeze')).toBe(false);
    useProfile.setState({ coins: 1000 });
    for (let i = 0; i < 4; i++) P().buy('freeze');
    expect(P().streak.freezes).toBe(3);
    expect(P().buy('hat_crown')).toBe(true);
    expect(P().pet.hat).toBe('hat_crown');
    expect(P().buy('hat_crown')).toBe(false);
    expect(P().coins).toBe(1000 - 150 - 120);
    P().wear(undefined);
    expect(P().pet.hat).toBeUndefined();
    P().wear('hat_beret'); // not owned
    expect(P().pet.hat).toBeUndefined();
  });

  it('boss win marks the week', () => {
    P().handle({ type: 'bossWin' }, T);
    expect(P().bossWeek).toBe('2026-09-21');
    expect(P().achievements['boss-1']).toBe(T);
  });
});
