import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../data/db';
import { newLeftToday, useLearn } from './store';
import { Rating, State } from './cards';
import { STARTER_DECKS } from './starter';

const L = () => useLearn.getState();

beforeEach(async () => {
  await Promise.all([db.decks.clear(), db.cards.clear(), db.logs.clear(), db.kv.clear()]);
  useLearn.setState({ loaded: false, decks: [], cards: [], today: [] });
});

describe('learn store', () => {
  it('seeds the starter decks exactly once', async () => {
    await L().load();
    const total = STARTER_DECKS.reduce((n, d) => n + d.cards.length, 0);
    expect(L().decks.map((d) => d.id)).toEqual(['a1-nomen', 'a1-verben']);
    expect(L().cards).toHaveLength(total);
    await L().load();
    expect(await db.cards.count()).toBe(total);
  });

  it('concurrent loads (startup + Cards window) seed only once', async () => {
    await Promise.all([L().load(), L().load(), L().load()]);
    expect(await db.decks.count()).toBe(STARTER_DECKS.length);
    expect(await db.cards.count()).toBe(STARTER_DECKS.reduce((n, d) => n + d.cards.length, 0));
  });

  it('a deleted built-in deck stays deleted after reload', async () => {
    await L().load();
    await L().deleteDeck('a1-verben');
    await L().load();
    expect(L().decks.map((d) => d.id)).toEqual(['a1-nomen']);
  });

  it('reviewing schedules the card, logs it and uses up the daily new-card allowance', async () => {
    await L().load();
    const deck = L().decks[0];
    expect(newLeftToday(L(), deck.id)).toBe(10);
    const card = L().cards.find((c) => c.deckId === deck.id)!;
    const next = await L().review(card.id, Rating.Good, 1234);
    expect(next?.srs.state).not.toBe(State.New);
    expect(L().today).toHaveLength(1);
    expect(newLeftToday(L(), deck.id)).toBe(9);
    // reviewing the same (no longer new) card again doesn't use more allowance
    await L().review(card.id, Rating.Good, 500);
    expect(newLeftToday(L(), deck.id)).toBe(9);
    // everything is persisted
    useLearn.setState({ cards: [], today: [] });
    await L().load();
    expect(L().cards.find((c) => c.id === card.id)?.srs.reps).toBe(2);
    expect(L().today).toHaveLength(2);
  });

  it('adds cards at the end of the new-card order and cascades deletes', async () => {
    const d = await L().addDeck('Meine Wörter');
    await L().addCards(d.id, [{ de: 'Katze', gender: 'die', tags: [] }, { de: 'Hund', gender: 'der', tags: [] }]);
    const [more] = await L().addCards(d.id, [{ de: 'Maus', gender: 'die', tags: [] }]);
    expect(more.order).toBe(2);
    await L().review(more.id, Rating.Again, 100);
    await L().deleteCard(more.id);
    expect(await db.logs.count()).toBe(0);
    await L().deleteDeck(d.id);
    expect(await db.cards.where('deckId').equals(d.id).count()).toBe(0);
  });
});

describe('practice from games', () => {
  it('counts as a review only for due cards; otherwise logs practice without rescheduling', async () => {
    await useLearn.getState().load();
    const [fresh, due] = useLearn.getState().cards;
    // make `due` a review card that is due now
    useLearn.setState((s) => ({ cards: s.cards.map((c) => (c.id === due.id ? { ...c, srs: { ...c.srs, state: State.Review, due: new Date(Date.now() - 1000), reps: 3, stability: 5, difficulty: 5, last_review: new Date(Date.now() - 5 * 86_400_000) } } : c)) }));
    expect(await useLearn.getState().practice(fresh.id, true, 800, 'game:artikel')).toBe('practice');
    expect(useLearn.getState().cards.find((c) => c.id === fresh.id)!.srs.state).toBe(State.New);
    expect(await useLearn.getState().practice(due.id, true, 800, 'game:artikel')).toBe('reviewed');
    expect(new Date(useLearn.getState().cards.find((c) => c.id === due.id)!.srs.due).getTime()).toBeGreaterThan(Date.now());
    const logs = useLearn.getState().today;
    expect(logs.map((l) => [l.source, !!l.practice, l.wasNew])).toEqual([['game:artikel', true, false], ['game:artikel', false, false]]);
    // practice never eats into the daily new-card allowance
    expect(newLeftToday(useLearn.getState(), fresh.deckId)).toBe(10);
  });
});
