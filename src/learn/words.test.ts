import { describe, expect, it } from 'vitest';
import { WORDS, wordOfDay } from './words';

describe('word of the day', () => {
  it('is stable during a day and changes the next day', () => {
    const morning = new Date(2026, 8, 25, 7, 0), night = new Date(2026, 8, 25, 23, 59), tomorrow = new Date(2026, 8, 26, 7, 0);
    expect(wordOfDay(morning)).toBe(wordOfDay(night));
    expect(wordOfDay(tomorrow)).not.toBe(wordOfDay(morning));
  });

  it('visits every word once per cycle', () => {
    const seen = new Set(Array.from({ length: WORDS.length }, (_, i) => wordOfDay(new Date(2026, 0, 1 + i))));
    expect(seen.size).toBe(WORDS.length);
  });

  it('every entry is complete and capitalised, examples end with punctuation', () => {
    for (const w of WORDS) {
      expect(['der', 'die', 'das']).toContain(w.gender);
      expect(w.de[0]).toBe(w.de[0].toUpperCase());
      if (w.plural) expect(w.plural[0]).toBe(w.plural[0].toUpperCase());
      expect(w.vi && w.en).toBeTruthy();
      expect(w.example.de).toMatch(/[.!?]$/);
    }
    expect(new Set(WORDS.map((w) => w.de)).size).toBe(WORDS.length);
  });
});
