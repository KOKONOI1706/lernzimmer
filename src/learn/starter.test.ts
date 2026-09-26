import { describe, expect, it } from 'vitest';
import { STARTER_DECKS } from './starter';

describe('starter decks', () => {
  const nouns = STARTER_DECKS[0].cards;

  it('has a sizeable noun deck with no duplicates', () => {
    expect(nouns.length).toBeGreaterThanOrEqual(170);
    expect(new Set(nouns.map((c) => c.de)).size).toBe(nouns.length);
  });

  it('every noun has an article, a capital letter, and both translations', () => {
    for (const c of nouns) {
      expect(['der', 'die', 'das'], c.de).toContain(c.gender);
      expect(c.de[0], c.de).toBe(c.de[0].toUpperCase());
      if (c.plural) expect(c.plural[0], c.de).toBe(c.plural[0].toUpperCase());
      expect(c.vi && c.en, c.de).toBeTruthy();
    }
  });

  it('has a balanced gender mix (useful for Artikel practice)', () => {
    const count = (g: string) => nouns.filter((c) => c.gender === g).length;
    for (const g of ['der', 'die', 'das']) expect(count(g)).toBeGreaterThan(nouns.length * 0.2);
  });

  it('reuses word-of-the-day examples', () => {
    expect(nouns.find((c) => c.de === 'Tisch')?.example?.de).toBe('Das Buch liegt auf dem Tisch.');
  });

  it('verbs and phrases have no article', () => {
    for (const c of STARTER_DECKS[1].cards) expect(c.gender).toBeUndefined();
    expect(STARTER_DECKS[1].cards.length).toBeGreaterThan(40);
  });
});
