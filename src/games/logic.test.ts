import { describe, expect, it } from 'vitest';
import {
  ARTIKEL_LIVES, artikelAnswer, artikelStart, checkNumber, fallTime, levelFor, makeNumber, memoryDeal, memoryDone,
  memoryFlip, memoryHide, pickCards, pointsFor, ZAHLEN_LEVELS,
} from './logic';
import { newSrs, State, type Card } from '../learn/cards';
import { mulberry32 } from '../audio/noise';
import { germanYear } from '../learn/german';

const NOW = new Date('2026-09-26T10:00:00Z');
const card = (id: string, over: Partial<Card['srs']> = {}): Card =>
  ({ id, deckId: 'd', de: id, tags: [], order: 0, createdAt: 0, srs: { ...newSrs(NOW), ...over } });

describe('pickCards', () => {
  it('returns unique cards, at most n', () => {
    const cards = Array.from({ length: 10 }, (_, i) => card(`c${i}`));
    const picked = pickCards(cards, 6, NOW, mulberry32(1));
    expect(picked).toHaveLength(6);
    expect(new Set(picked.map((c) => c.id)).size).toBe(6);
    expect(pickCards(cards.slice(0, 2), 6, NOW)).toHaveLength(2);
  });

  it('favours due and lapsed cards', () => {
    const cards = [
      card('due', { state: State.Review, due: new Date(NOW.getTime() - 1000), lapses: 2 }),
      ...Array.from({ length: 9 }, (_, i) => card(`new${i}`)),
    ];
    let hits = 0;
    const rnd = mulberry32(42);
    for (let i = 0; i < 500; i++) if (pickCards(cards, 1, NOW, rnd)[0].id === 'due') hits++;
    // weight 5 vs 9×1 → ~36 %; uniform would be 10 %
    expect(hits / 500).toBeGreaterThan(0.25);
  });
});

describe('Artikel-Regen', () => {
  it('scores, levels up, and ends after the last life', () => {
    let s = artikelStart();
    for (let i = 0; i < 5; i++) s = artikelAnswer(s, 'der', 'der');
    expect(s).toMatchObject({ correct: 5, streak: 5, lives: ARTIKEL_LIVES });
    expect(levelFor(s.correct)).toBe(2);
    s = artikelAnswer(s, 'die', 'das');
    expect(s).toMatchObject({ streak: 0, lives: 2, best: 5 });
    s = artikelAnswer(s, undefined, 'das'); // missed: hit the ground
    s = artikelAnswer(s, 'der', 'die');
    expect(s.over).toBe(true);
    expect(artikelAnswer(s, 'die', 'die')).toBe(s); // no play after game over
  });

  it('speeds up but stays playable', () => {
    expect(fallTime(1)).toBeGreaterThan(fallTime(5));
    expect(fallTime(100)).toBe(2);
    expect(pointsFor(1, 1)).toBe(10);
    expect(pointsFor(5, 1)).toBe(20);
    expect(pointsFor(1, 3)).toBe(14);
  });
});

describe('Memory', () => {
  const pairs = [
    { id: 'a', de: 'Tisch', gender: 'der' as const, meaning: 'cái bàn' },
    { id: 'b', de: 'Lampe', gender: 'die' as const, meaning: 'cái đèn' },
  ];

  it('deals two tiles per pair with the article on the German side', () => {
    const s = memoryDeal(pairs, mulberry32(3));
    expect(s.tiles).toHaveLength(4);
    expect(s.tiles.map((t) => t.text).sort()).toEqual(['cái bàn', 'cái đèn', 'der Tisch', 'die Lampe']);
  });

  it('matches pairs, locks on a miss until hidden, and ignores invalid flips', () => {
    let s = memoryDeal(pairs, mulberry32(3));
    const idx = (text: string) => s.tiles.find((t) => t.text === text)!.id;
    s = memoryFlip(s, idx('der Tisch')).state;
    expect(memoryFlip(s, idx('der Tisch')).state).toBe(s); // same tile again
    const miss = memoryFlip(s, idx('cái đèn'));
    expect(miss.result).toBe('miss');
    expect(memoryFlip(miss.state, idx('die Lampe')).state).toBe(miss.state); // locked
    s = memoryHide(miss.state);
    s = memoryFlip(s, idx('der Tisch')).state;
    const hit = memoryFlip(s, idx('cái bàn'));
    expect(hit).toMatchObject({ result: 'match', pair: 'a' });
    s = memoryFlip(hit.state, idx('die Lampe')).state;
    s = memoryFlip(s, idx('cái đèn')).state;
    expect(memoryDone(s)).toBe(true);
    expect(s.moves).toBe(3);
  });
});

describe('Zahlen-Sprint', () => {
  it('numbers stay in the level range and avoid immediate repeats', () => {
    const rnd = mulberry32(9);
    for (const level of ZAHLEN_LEVELS) {
      let last: number | undefined;
      for (let i = 0; i < 200; i++) {
        const n = makeNumber(level, rnd, last);
        expect(n).toBeGreaterThanOrEqual(level.min);
        expect(n).toBeLessThanOrEqual(level.max);
        expect(n).not.toBe(last);
        last = n;
      }
    }
  });

  it('accepts digits with common separators only', () => {
    expect(checkNumber('97', 97)).toBe(true);
    expect(checkNumber(' 1.980 ', 1980)).toBe(true);
    expect(checkNumber('1 980', 1980)).toBe(true);
    expect(checkNumber('79', 97)).toBe(false);
    expect(checkNumber('siebenundneunzig', 97)).toBe(false);
    expect(checkNumber('', 0)).toBe(false);
  });

  it('reads years the German way', () => {
    expect(germanYear(1980)).toBe('neunzehnhundertachtzig');
    expect(germanYear(1900)).toBe('neunzehnhundert');
    expect(germanYear(1989)).toBe('neunzehnhundertneunundachtzig');
    expect(germanYear(2026)).toBe('zweitausendsechsundzwanzig');
    expect(germanYear(2000)).toBe('zweitausend');
  });
});
