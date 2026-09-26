import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { db } from '../data/db';
import { isNew, newSrs, Rating, schedule, State, type Card, type Deck, type Grade, type ReviewLog } from './cards';
import type { CardFields } from './csv';
import { STARTER_DECKS, STARTER_VERSION } from './starter';

/** Deck that collects cards made from board notes. */
export const BOARD_DECK = 'board';
const SEEDED_KEY = 'learn.starterVersion';

export const startOfDay = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

interface LearnState {
  loaded: boolean;
  decks: Deck[];
  cards: Card[];
  /** today's review logs (for the daily new-card limit and stats) */
  today: ReviewLog[];
}

interface LearnActions {
  load: () => Promise<void>;
  addDeck: (name: string, id?: string) => Promise<Deck>;
  updateDeck: (id: string, patch: Partial<Pick<Deck, 'name' | 'newPerDay'>>) => Promise<void>;
  deleteDeck: (id: string) => Promise<void>;
  addCards: (deckId: string, fields: CardFields[]) => Promise<Card[]>;
  updateCard: (id: string, fields: Partial<CardFields>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  review: (cardId: string, rating: Grade, ms: number, source?: string) => Promise<Card | undefined>;
  /**
   * An answer from a game. Counts as a real review only when the card is due (or in learning);
   * otherwise it's logged as practice so fast arcade answers don't distort the schedule.
   */
  practice: (cardId: string, correct: boolean, ms: number, source: string) => Promise<'reviewed' | 'practice' | undefined>;
}

/** New cards still allowed today for a deck. */
export function newLeftToday(s: Pick<LearnState, 'today' | 'decks'>, deckId: string): number {
  const deck = s.decks.find((d) => d.id === deckId);
  if (!deck) return 0;
  const used = s.today.filter((l) => l.deckId === deckId && l.wasNew).length;
  return Math.max(0, deck.newPerDay - used);
}

function makeCard(deckId: string, f: CardFields, order: number, now: number): Card {
  return { id: nanoid(10), deckId, order, createdAt: now, srs: newSrs(new Date(now)), ...f, tags: f.tags ?? [] };
}

let loading: Promise<void> | undefined;

export const useLearn = create<LearnState & LearnActions>()((set, get) => ({
  loaded: false,
  decks: [],
  cards: [],
  today: [],

  // concurrent callers (startup + Cards window) share one in-flight load
  load: () => (loading ??= (async () => {
    // seed built-in decks once (and add new built-in decks in later versions)
    const seeded = ((await db.kv.get(SEEDED_KEY))?.value as number | undefined) ?? 0;
    if (seeded < STARTER_VERSION) {
      const now = Date.now();
      await db.transaction('rw', db.decks, db.cards, db.kv, async () => {
        for (const sd of STARTER_DECKS) {
          if (await db.decks.get(sd.key)) continue;
          await db.decks.put({ id: sd.key, name: sd.name, builtin: true, newPerDay: 10, createdAt: now });
          await db.cards.bulkPut(sd.cards.map((f, i) => makeCard(sd.key, f, i, now)));
        }
        await db.kv.put({ key: SEEDED_KEY, value: STARTER_VERSION, updatedAt: now });
      });
    }
    const [decks, cards, today] = await Promise.all([
      db.decks.toArray(), db.cards.toArray(), db.logs.where('at').aboveOrEqual(startOfDay()).toArray(),
    ]);
    set({ loaded: true, decks: decks.sort((a, b) => a.createdAt - b.createdAt), cards, today });
  })().finally(() => { loading = undefined; })),

  addDeck: async (name, id = nanoid(8)) => {
    const deck: Deck = { id, name: name.trim(), newPerDay: 20, createdAt: Date.now() };
    await db.decks.put(deck);
    set((s) => ({ decks: [...s.decks, deck] }));
    return deck;
  },

  updateDeck: async (id, patch) => {
    await db.decks.update(id, patch);
    set((s) => ({ decks: s.decks.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
  },

  deleteDeck: async (id) => {
    await db.transaction('rw', db.decks, db.cards, db.logs, async () => {
      await db.cards.where('deckId').equals(id).delete();
      await db.logs.where('deckId').equals(id).delete();
      await db.decks.delete(id);
    });
    // built-in decks are re-seeded only if the user resets; don't bring them back on reload
    set((s) => ({ decks: s.decks.filter((d) => d.id !== id), cards: s.cards.filter((c) => c.deckId !== id), today: s.today.filter((l) => l.deckId !== id) }));
  },

  addCards: async (deckId, fields) => {
    const now = Date.now();
    const start = Math.max(-1, ...get().cards.filter((c) => c.deckId === deckId).map((c) => c.order)) + 1;
    const cards = fields.map((f, i) => makeCard(deckId, f, start + i, now));
    await db.cards.bulkPut(cards);
    set((s) => ({ cards: [...s.cards, ...cards] }));
    return cards;
  },

  updateCard: async (id, fields) => {
    const cur = get().cards.find((c) => c.id === id);
    if (!cur) return;
    const next = { ...cur, ...fields };
    await db.cards.put(next);
    set((s) => ({ cards: s.cards.map((c) => (c.id === id ? next : c)) }));
  },

  deleteCard: async (id) => {
    await db.transaction('rw', db.cards, db.logs, async () => {
      await db.cards.delete(id);
      await db.logs.where('cardId').equals(id).delete();
    });
    set((s) => ({ cards: s.cards.filter((c) => c.id !== id), today: s.today.filter((l) => l.cardId !== id) }));
  },

  practice: async (cardId, correct, ms, source) => {
    const cur = get().cards.find((c) => c.id === cardId);
    if (!cur) return;
    const now = Date.now();
    const learning = cur.srs.state === State.Learning || cur.srs.state === State.Relearning;
    if (!isNew(cur) && (learning || new Date(cur.srs.due).getTime() <= now)) {
      await get().review(cardId, correct ? Rating.Good : Rating.Again, ms, source);
      return 'reviewed';
    }
    const log: ReviewLog = { id: nanoid(12), cardId, deckId: cur.deckId, at: now, rating: correct ? Rating.Good : Rating.Again, wasNew: false, ms: Math.round(ms), source, practice: true };
    await db.logs.put(log);
    set((s) => ({ today: [...s.today, log] }));
    return 'practice';
  },

  review: async (cardId, rating, ms, source = 'review') => {
    const cur = get().cards.find((c) => c.id === cardId);
    if (!cur) return;
    const now = new Date();
    const next = schedule(cur, rating, now);
    const log: ReviewLog = { id: nanoid(12), cardId, deckId: cur.deckId, at: now.getTime(), rating, wasNew: isNew(cur), ms: Math.round(ms), source };
    await db.transaction('rw', db.cards, db.logs, async () => {
      await db.cards.put(next);
      await db.logs.put(log);
    });
    set((s) => ({
      cards: s.cards.map((c) => (c.id === cardId ? next : c)),
      today: log.at >= startOfDay() ? [...s.today, log] : s.today,
    }));
    return next;
  },
}));
