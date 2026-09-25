import { describe, expect, it } from 'vitest';
import { germanTimeColloquial as col, germanTimeOfficial as off, numberToGerman as n } from './german';

describe('numberToGerman', () => {
  it.each([
    [0, 'null'], [1, 'eins'], [7, 'sieben'], [12, 'zwölf'], [16, 'sechzehn'], [17, 'siebzehn'],
    [20, 'zwanzig'], [21, 'einundzwanzig'], [30, 'dreißig'], [97, 'siebenundneunzig'],
    [100, 'einhundert'], [101, 'einhunderteins'], [365, 'dreihundertfünfundsechzig'],
    [1000, 'eintausend'], [2026, 'zweitausendsechsundzwanzig'], [21_000, 'einundzwanzigtausend'],
  ])('%i → %s', (num, word) => expect(n(num)).toBe(word));

  it('rejects unsupported input', () => {
    expect(() => n(-1)).toThrow();
    expect(() => n(1.5)).toThrow();
  });
});

describe('German clock time', () => {
  it.each([
    [15, 0, 'drei Uhr'], [1, 0, 'ein Uhr'], [13, 0, 'ein Uhr'], [0, 0, 'zwölf Uhr'],
    [15, 5, 'fünf nach drei'], [15, 2, 'zwei Minuten nach drei'], [15, 1, 'eine Minute nach drei'],
    [15, 15, 'Viertel nach drei'], [15, 20, 'zwanzig nach drei'], [15, 25, 'fünf vor halb vier'],
    [15, 28, 'zwei Minuten vor halb vier'], [15, 30, 'halb vier'], [12, 30, 'halb eins'],
    [15, 35, 'fünf nach halb vier'], [15, 40, 'zwanzig vor vier'], [15, 45, 'Viertel vor vier'],
    [15, 55, 'fünf vor vier'], [23, 45, 'Viertel vor zwölf'], [0, 15, 'Viertel nach zwölf'], [1, 10, 'zehn nach eins'],
  ])('%i:%i → %s', (h, m, phrase) => expect(col(h, m)).toBe(phrase));

  it.each([
    [15, 15, 'fünfzehn Uhr fünfzehn'], [1, 0, 'ein Uhr'], [0, 5, 'null Uhr fünf'], [21, 30, 'einundzwanzig Uhr dreißig'],
  ])('official %i:%i → %s', (h, m, phrase) => expect(off(h, m)).toBe(phrase));
});
