import { describe, expect, it } from 'vitest';
import { exportCards, importCards, parseDelimited } from './csv';

describe('csv', () => {
  it('parses quotes, escaped quotes, commas and newlines inside fields', () => {
    expect(parseDelimited('a,"b, c","say ""hi""\nthere"\r\nd,e,f\n', ',')).toEqual([
      ['a', 'b, c', 'say "hi"\nthere'],
      ['d', 'e', 'f'],
    ]);
  });

  it('round-trips our own export', () => {
    const cards = [
      { de: 'Tisch', gender: 'der' as const, plural: 'Tische', vi: 'cái bàn', en: 'table', example: { de: 'Das Buch liegt auf dem Tisch.', vi: 'Sách nằm trên bàn.', en: undefined }, tags: ['wohnen', 'a1'] },
      { de: 'Wetter', gender: 'das' as const, plural: null, vi: 'thời tiết, "trời"', en: undefined, example: undefined, tags: [] },
      { de: 'gehen', gender: undefined, plural: undefined, vi: 'đi', en: 'to go', example: undefined, tags: ['verb'] },
    ];
    expect(importCards(exportCards(cards))).toEqual({ cards, skipped: 0 });
  });

  it('imports an Anki plain-text export (tab separated, html, article in front)', () => {
    const anki = '#separator:tab\n#html:true\nder Hund\tcon chó<br>dog\ndie Katze\tcon mèo\n\t(empty front)\n';
    expect(importCards(anki)).toEqual({
      cards: [
        { de: 'Hund', gender: 'der', plural: undefined, vi: 'con chó · dog', en: undefined, example: undefined, tags: [] },
        { de: 'Katze', gender: 'die', plural: undefined, vi: 'con mèo', en: undefined, example: undefined, tags: [] },
      ],
      skipped: 1,
    });
  });

  it('accepts semicolon CSV with a header in any column order', () => {
    const r = importCards('vi;de;gender\ncái bàn;Tisch;der\n');
    expect(r.cards[0]).toMatchObject({ de: 'Tisch', gender: 'der', vi: 'cái bàn' });
  });
});
