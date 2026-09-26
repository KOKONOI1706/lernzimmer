import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isoDate, isTime, minutesOf, monthGrid, parseIso } from './dates';
import { fromGoogle, toGoogle } from './google';

describe('dates', () => {
  it('month grid starts on Monday and always has 6 weeks', () => {
    const g = monthGrid(2026, 8); // September 2026 starts on a Tuesday
    expect(g).toHaveLength(42);
    expect(g[0]).toEqual({ date: '2026-08-31', inMonth: false });
    expect(g[1]).toEqual({ date: '2026-09-01', inMonth: true });
    expect(g.filter((d) => d.inMonth)).toHaveLength(30);
  });

  it('handles months starting on Monday and leap years', () => {
    expect(monthGrid(2026, 5)[0].date).toBe('2026-06-01'); // June 2026 starts on Monday
    expect(monthGrid(2028, 1).filter((d) => d.inMonth)).toHaveLength(29);
  });

  it('iso helpers round-trip and count days across DST', () => {
    expect(isoDate(parseIso('2026-03-29'))).toBe('2026-03-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2); // DST switch in Europe
    expect(daysBetween('2026-09-26', '2026-09-20')).toBe(-6);
  });

  it('time helpers', () => {
    expect(isTime('09:30')).toBe(true);
    expect(isTime('24:00')).toBe(false);
    expect(minutesOf('13:05')).toBe(785);
    expect(minutesOf(undefined)).toBe(-1);
  });
});

describe('Google mapping', () => {
  it('all-day event keeps its date', () => {
    expect(fromGoogle({ id: 'a1', summary: 'Goethe A1', start: { date: '2026-11-02' }, end: { date: '2026-11-03' }, htmlLink: 'https://calendar.google.com/x' }))
      .toEqual({ id: 'g:a1', googleId: 'a1', source: 'google', title: 'Goethe A1', notes: undefined, link: 'https://calendar.google.com/x', done: false, kind: 'event', date: '2026-11-02' });
  });

  it('timed event is converted to local time', () => {
    const start = new Date(2026, 8, 26, 18, 30), end = new Date(2026, 8, 26, 20, 0);
    const e = fromGoogle({ id: 'b', start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() } }, '(ohne Titel)');
    expect(e).toMatchObject({ date: '2026-09-26', time: '18:30', endTime: '20:00', title: '(ohne Titel)' });
  });

  it('local entry → Google body (all-day uses exclusive end, timed defaults to 1h)', () => {
    expect(toGoogle({ date: '2026-09-30', title: 'Vokabeln', kind: 'task' }, 'Asia/Ho_Chi_Minh')).toEqual({
      summary: 'Vokabeln', description: undefined, start: { date: '2026-09-30' }, end: { date: '2026-10-01' },
    });
    expect(toGoogle({ date: '2026-09-30', time: '23:30', title: 'Nachtzug', kind: 'event', notes: 'Gleis 4' }, 'Europe/Berlin')).toEqual({
      summary: 'Nachtzug', description: 'Gleis 4',
      start: { dateTime: '2026-09-30T23:30:00', timeZone: 'Europe/Berlin' },
      end: { dateTime: '2026-10-01T00:30:00', timeZone: 'Europe/Berlin' },
    });
    expect(toGoogle({ date: '2026-11-02', title: 'Goethe A1', kind: 'exam' }).summary).toBe('🎓 Goethe A1');
  });
});
