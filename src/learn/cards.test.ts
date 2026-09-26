import { describe, expect, it } from 'vitest';
import { buildQueue, checkAnswer, formatInterval, LEARN_AHEAD_MS, newSrs, parseNote, preview, Rating, requeue, schedule, State, suggestRating, type Card } from './cards';

const NOW = new Date('2026-09-25T10:00:00Z');
const card = (id: string, over: Partial<Card> = {}): Card => ({
  id, deckId: 'd', de: id, tags: [], order: 0, createdAt: 0, srs: newSrs(NOW), ...over,
});
const withSrs = (c: Card, state: State, dueOffsetMs: number): Card => ({ ...c, srs: { ...c.srs, state, due: new Date(NOW.getTime() + dueOffsetMs), reps: 1 } });

describe('scheduling', () => {
  it('a new card rated Good is due again within minutes, Easy in days', () => {
    const c = card('Tisch');
    const p = preview(c, NOW);
    expect(p[Rating.Again].getTime()).toBeLessThan(p[Rating.Good].getTime());
    expect(p[Rating.Good].getTime() - NOW.getTime()).toBeLessThan(LEARN_AHEAD_MS);
    expect(p[Rating.Easy].getTime() - NOW.getTime()).toBeGreaterThan(24 * 3600_000);
    const next = schedule(c, Rating.Good, NOW);
    expect(next.srs.reps).toBe(1);
    expect(next.srs.state).not.toBe(State.New);
  });

  it('formats intervals compactly', () => {
    expect(formatInterval(30_000)).toBe('<1m');
    expect(formatInterval(10 * 60_000)).toBe('10m');
    expect(formatInterval(5 * 3600_000)).toBe('5h');
    expect(formatInterval(4 * 86_400_000)).toBe('4d');
    expect(formatInterval(90 * 86_400_000)).toBe('3mo');
  });
});

describe('queue', () => {
  it('learning first, then reviews by overdue-ness with new cards mixed in, capped by the daily limit', () => {
    const cards = [
      withSrs(card('r-late'), State.Review, -5 * 86_400_000),
      withSrs(card('r-soon'), State.Review, -1000),
      withSrs(card('r-future'), State.Review, 86_400_000),
      withSrs(card('learn'), State.Learning, 5 * 60_000),
      withSrs(card('r3'), State.Review, -2000),
      withSrs(card('r4'), State.Review, -3000),
      card('n1', { order: 1 }), card('n2', { order: 2 }), card('n3', { order: 3 }),
    ];
    const q = buildQueue(cards, NOW, 2).map((c) => c.id);
    expect(q).toEqual(['learn', 'r-late', 'r4', 'r3', 'n1', 'r-soon', 'n2']);
  });

  it('requeues soon-due cards a couple of places later and drops long-interval ones', () => {
    const q = [card('a'), card('b'), card('c')];
    const again = withSrs(card('a'), State.Learning, 60_000);
    expect(requeue(q, again, NOW).map((c) => c.id)).toEqual(['b', 'c', 'a']);
    const done = withSrs(card('a'), State.Review, 3 * 86_400_000);
    expect(requeue(q, done, NOW).map((c) => c.id)).toEqual(['b', 'c']);
  });
});

describe('checkAnswer', () => {
  const tisch = { de: 'Tisch', gender: 'der' as const };
  const maedchen = { de: 'Mädchen', gender: 'das' as const };
  it.each([
    ['der Tisch', tisch, 'correct'],
    ['  der   Tisch. ', tisch, 'correct'],
    ['die Tisch', tisch, 'article'],
    ['Tisch', tisch, 'article'],
    ['der tisch', tisch, 'typo'],
    ['der Tish', tisch, 'typo'],
    ['das Maedchen', maedchen, 'umlaut'],
    ['das Madchen', maedchen, 'typo'],
    ['der Stuhl', tisch, 'wrong'],
    ['', tisch, 'wrong'],
    ['gehen', { de: 'gehen' }, 'correct'],
  ] as const)('%s → %s', (input, c, verdict) => expect(checkAnswer(input, c)).toBe(verdict));

  it('suggests ratings', () => {
    expect(suggestRating('correct')).toBe(Rating.Good);
    expect(suggestRating('article')).toBe(Rating.Hard);
    expect(suggestRating('wrong')).toBe(Rating.Again);
  });
});

describe('parseNote', () => {
  it('reads article, plural, meaning and a quoted example', () => {
    expect(parseNote('der Tisch\ndie Tische\n\ncái bàn\n„Das Buch liegt auf dem Tisch.“')).toEqual({
      de: 'Tisch', gender: 'der', plural: 'Tische', vi: 'cái bàn', example: { de: 'Das Buch liegt auf dem Tisch.' },
    });
  });
  it('handles no article, "–" for no plural, and several meaning lines', () => {
    expect(parseNote('gehen\n–\nđi\nto go')).toEqual({ de: 'gehen', gender: undefined, plural: null, vi: 'đi · to go', example: undefined });
  });
  it('works for the word-of-the-day note format', () => {
    expect(parseNote('das Buch\ndie Bücher\n\nquyển sách\n„Ich lese ein Buch.“')).toMatchObject({ de: 'Buch', gender: 'das', plural: 'Bücher', vi: 'quyển sách' });
  });
  it('rejects empty notes', () => expect(parseNote(' \n ')).toBeNull());
});
