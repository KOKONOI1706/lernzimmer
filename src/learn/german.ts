// German numbers and clock times. Used by the clock widget, the time quiz and (later) Zahlen-Sprint.

const UNITS = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun',
  'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];

/** 0–999 999 in words, e.g. 97 → "siebenundneunzig" (units before tens!). */
export function numberToGerman(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999) throw new RangeError(`unsupported number ${n}`);
  if (n < 20) return UNITS[n];
  if (n < 100) {
    const u = n % 10, t = Math.floor(n / 10);
    return u ? `${u === 1 ? 'ein' : UNITS[u]}und${TENS[t]}` : TENS[t];
  }
  if (n < 1000) {
    const h = Math.floor(n / 100), rest = n % 100;
    return `${h === 1 ? 'ein' : UNITS[h]}hundert${rest ? numberToGerman(rest) : ''}`;
  }
  const k = Math.floor(n / 1000), rest = n % 1000;
  return `${k === 1 ? 'ein' : numberToGerman(k)}tausend${rest ? numberToGerman(rest) : ''}`;
}

/**
 * Years are read differently from numbers: 1980 → "neunzehnhundertachtzig" (hundreds form) for 1100–1999;
 * from 2000 on as ordinary numbers ("zweitausendsechsundzwanzig").
 */
export function germanYear(y: number): string {
  if (y >= 1100 && y < 2000) {
    const rest = y % 100;
    return `${numberToGerman(Math.floor(y / 100))}hundert${rest ? numberToGerman(rest) : ''}`;
  }
  return numberToGerman(y);
}

/** Hour as used in colloquial phrases: 12-hour, "eins" not "ein". */
const hourWord = (h: number) => numberToGerman(h % 12 || 12);

/** "fünf", "zehn" … for multiples of five; otherwise "eine Minute" / "sieben Minuten". */
function minutes(k: number): string {
  if (k % 5 === 0) return numberToGerman(k);
  return k === 1 ? 'eine Minute' : `${numberToGerman(k)} Minuten`;
}

/**
 * Everyday (colloquial, 12-hour) time without "Es ist":
 *   :00 "drei Uhr" · :05 "fünf nach drei" · :15 "Viertel nach drei" · :25 "fünf vor halb vier"
 *   :30 "halb vier" · :35 "fünf nach halb vier" · :40 "zwanzig vor vier" · :45 "Viertel vor vier"
 */
export function germanTimeColloquial(h24: number, m: number): string {
  const h = h24 % 24;
  const next = (h + 1) % 24;
  if (m === 0) return h % 12 === 1 ? 'ein Uhr' : `${hourWord(h)} Uhr`;
  if (m === 15) return `Viertel nach ${hourWord(h)}`;
  if (m === 30) return `halb ${hourWord(next)}`;
  if (m === 45) return `Viertel vor ${hourWord(next)}`;
  if (m <= 20) return `${minutes(m)} nach ${hourWord(h)}`;
  if (m < 30) return `${minutes(30 - m)} vor halb ${hourWord(next)}`;
  if (m < 40) return `${minutes(m - 30)} nach halb ${hourWord(next)}`;
  return `${minutes(60 - m)} vor ${hourWord(next)}`;
}

/** Official (24-hour) time as on the radio or at the station: "fünfzehn Uhr fünfzehn". */
export function germanTimeOfficial(h24: number, m: number): string {
  const h = h24 % 24;
  const hw = h === 1 ? 'ein' : numberToGerman(h);
  return m === 0 ? `${hw} Uhr` : `${hw} Uhr ${numberToGerman(m)}`;
}

export const itIs = (phrase: string) => `Es ist ${phrase}.`;
