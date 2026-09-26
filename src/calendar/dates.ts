// Calendar date helpers. Dates are local "YYYY-MM-DD" strings so an all-day entry never shifts across time zones.

export type IsoDate = string;

const pad = (n: number) => String(n).padStart(2, '0');

export const isoDate = (d: Date): IsoDate => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "2026-09-26" → local midnight Date */
export function parseIso(s: IsoDate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const addDays = (s: IsoDate, n: number): IsoDate => { const d = parseIso(s); d.setDate(d.getDate() + n); return isoDate(d); };

/** Whole days from a to b (b − a), DST-safe. */
export const daysBetween = (a: IsoDate, b: IsoDate) =>
  Math.round((Date.UTC(...ymd(b)) - Date.UTC(...ymd(a))) / 86_400_000);
const ymd = (s: IsoDate): [number, number, number] => { const [y, m, d] = s.split('-').map(Number); return [y, m - 1, d]; };

/**
 * 6×7 month grid starting on Monday (the German/Vietnamese convention), including
 * trailing days of the previous and leading days of the next month.
 */
export function monthGrid(year: number, month0: number): { date: IsoDate; inMonth: boolean }[] {
  const first = new Date(year, month0, 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(year, month0, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { date: isoDate(d), inMonth: d.getMonth() === month0 };
  });
}

/** Localised weekday short names, Monday first. */
export function weekdayNames(locale: string): string[] {
  // 1 January 2024 was a Monday
  return Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' }).replace('.', ''));
}

export const monthTitle = (year: number, month0: number, locale: string) =>
  new Date(year, month0, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });

/** "HH:MM" → minutes since midnight, for sorting (untimed entries first). */
export const minutesOf = (t?: string) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : -1);

export const isTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
