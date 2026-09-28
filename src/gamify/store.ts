import { create } from 'zustand';
import { isoDate, type IsoDate } from '../calendar/dates';
import { onStudy, type StudyEvent } from './events';
import {
  ACHIEVEMENTS, addStats, advanceQuests, EMPTY_STATS, feed, LEVEL_UP_COINS, levelInfo, MAX_FREEZES, QUEST_REWARD,
  questsFor, rewardFor, touchStreak, weekOf, foodFor, type Pet, type Quest, type Stats, type Streak,
} from './rules';

export const SHOP = [
  { id: 'freeze', price: 50, icon: 'fire' },
  { id: 'hat_beret', price: 80, icon: 'hat_beret' },
  { id: 'non_la', price: 60, icon: 'non_la' },
  { id: 'hat_crown', price: 120, icon: 'hat_crown' },
] as const;
export type ShopItem = (typeof SHOP)[number]['id'];

/** Something worth a toast: a level-up, an unlocked achievement, a freeze that saved the streak. */
export type Celebration = { kind: 'level'; name: string } | { kind: 'achievement'; id: string } | { kind: 'freeze'; used: number };

export interface Profile {
  xp: number;
  coins: number;
  streak: Streak;
  pet: Pet;
  quests: { day: IsoDate; list: Quest[] };
  achievements: Record<string, number>;
  stats: Stats;
  owned: string[];
  /** Monday of the week the boss was last beaten */
  bossWeek?: IsoDate;
}

interface Actions {
  handle: (e: StudyEvent, at?: number) => Celebration[];
  /** make sure today's quests exist (call when showing them) */
  ensureToday: (at?: number) => void;
  claimQuest: (id: string, at?: number) => Celebration[];
  buy: (item: ShopItem) => boolean;
  wear: (hat?: string) => void;
  renamePet: (name: string) => void;
  hydrate: (p: Partial<Profile>) => void;
}

export const newProfile = (now = Date.now()): Profile => ({
  xp: 0, coins: 0,
  streak: { current: 0, best: 0, freezes: 0 },
  pet: { name: 'Brezel', food: 70, updatedAt: now },
  quests: { day: isoDate(new Date(now)), list: questsFor(isoDate(new Date(now))) },
  achievements: {}, stats: { ...EMPTY_STATS }, owned: [],
});

export const pickProfile = (s: Profile): Profile => {
  const { xp, coins, streak, pet, quests, achievements, stats, owned, bossWeek } = s;
  return { xp, coins, streak, pet, quests, achievements, stats, owned, bossWeek };
};

/** Add XP and coins, noting a level-up (which pays a bonus). */
function gain(p: Profile, xp: number, coins: number, out: Celebration[]): Pick<Profile, 'xp' | 'coins'> {
  const before = levelInfo(p.xp).index;
  const after = levelInfo(p.xp + xp);
  const levelUps = after.index - before;
  if (levelUps > 0) out.push({ kind: 'level', name: after.name });
  return { xp: p.xp + xp, coins: p.coins + coins + levelUps * LEVEL_UP_COINS };
}

export const useProfile = create<Profile & Actions>()((set, get) => ({
  ...newProfile(),

  ensureToday: (at = Date.now()) => {
    const day = isoDate(new Date(at));
    if (get().quests.day !== day) set({ quests: { day, list: questsFor(day) } });
  },

  handle: (e, at = Date.now()) => {
    get().ensureToday(at);
    const p = get();
    const out: Celebration[] = [];
    const today = isoDate(new Date(at));
    const r = rewardFor(e);
    const { streak, usedFreezes } = touchStreak(p.streak, today);
    if (usedFreezes) out.push({ kind: 'freeze', used: usedFreezes });
    const stats = addStats(p.stats, e);
    const next: Partial<Profile> = {
      ...gain(p, r.xp, r.coins, out),
      streak,
      stats,
      pet: feed(p.pet, foodFor(e), at),
      quests: { ...p.quests, list: advanceQuests(p.quests.list, e) },
      bossWeek: e.type === 'bossWin' ? weekOf(today) : p.bossWeek,
    };
    const level = levelInfo(next.xp!).index;
    const achievements = { ...p.achievements };
    for (const a of ACHIEVEMENTS) {
      if (!achievements[a.id] && a.check(stats, { streakBest: streak.best, level })) { achievements[a.id] = at; out.push({ kind: 'achievement', id: a.id }); }
    }
    set({ ...next, achievements });
    return out;
  },

  claimQuest: (id, at = Date.now()) => {
    const p = get();
    const q = p.quests.list.find((x) => x.id === id);
    if (!q || q.claimed || q.progress < q.target) return [];
    const out: Celebration[] = [];
    set({ ...gain(p, QUEST_REWARD.xp, QUEST_REWARD.coins, out), quests: { ...p.quests, list: p.quests.list.map((x) => (x.id === id ? { ...x, claimed: true } : x)) }, pet: feed(p.pet, 5, at) });
    if (out.length) celebrate(out);
    return out;
  },

  buy: (item) => {
    const p = get();
    const offer = SHOP.find((s) => s.id === item);
    if (!offer || p.coins < offer.price) return false;
    if (item === 'freeze') {
      if (p.streak.freezes >= MAX_FREEZES) return false;
      set({ coins: p.coins - offer.price, streak: { ...p.streak, freezes: p.streak.freezes + 1 } });
      return true;
    }
    if (p.owned.includes(item)) return false;
    set({ coins: p.coins - offer.price, owned: [...p.owned, item], pet: { ...p.pet, hat: item } });
    return true;
  },

  wear: (hat) => set((s) => ({ pet: { ...s.pet, hat: hat && s.owned.includes(hat) ? hat : undefined } })),
  renamePet: (name) => set((s) => ({ pet: { ...s.pet, name: name.trim().slice(0, 20) || 'Brezel' } })),
  hydrate: (p) => set(p),
}));

// Celebrations are shown by whoever registers here (the App shows toasts); keeps this module UI-free.
let celebrate: (c: Celebration[]) => void = () => {};
export const setCelebrationHandler = (fn: (c: Celebration[]) => void) => { celebrate = fn; };

onStudy((e, at) => {
  const c = useProfile.getState().handle(e, at);
  if (c.length) celebrate(c);
});
