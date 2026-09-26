import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as g from './google';
import { entriesOn, nextExam, useCalendar } from './store';
import type { CalEntry } from './types';

const C = () => useCalendar.getState();
const remote = (id: string, date: string, over: Partial<CalEntry> = {}): CalEntry =>
  ({ id: `g:${id}`, googleId: id, source: 'google', date, title: id, kind: 'event', done: false, ...over });

beforeEach(() => {
  vi.restoreAllMocks();
  useCalendar.setState({ entries: [], googleDone: {}, wantsGoogle: false, google: { status: 'off', events: [] } });
});

describe('calendar store', () => {
  it('merges local and Google entries by day, sorted by time, without duplicating copies', async () => {
    await C().add({ date: '2026-09-26', title: 'Vokabeln', kind: 'task' });
    await C().add({ date: '2026-09-26', title: 'Kurs', kind: 'event', time: '18:00' });
    const copy = await C().add({ date: '2026-09-26', title: 'Tandem', kind: 'event', time: '09:00' });
    C().update(copy.id, { googleId: 'tandem' });
    useCalendar.setState({ google: { status: 'on', events: [remote('tandem', '2026-09-26', { time: '09:00' }), remote('arzt', '2026-09-26', { time: '11:00' }), remote('x', '2026-09-27')] } });
    expect(entriesOn(C(), '2026-09-26').map((e) => e.title)).toEqual(['Vokabeln', 'Tandem', 'arzt', 'Kurs']);
  });

  it('ticks Google events off locally only', () => {
    useCalendar.setState({ google: { status: 'on', events: [remote('arzt', '2026-09-26')] } });
    C().toggleDone('g:arzt');
    expect(entriesOn(C(), '2026-09-26')[0].done).toBe(true);
    expect(C().google.events[0].done).toBe(false); // cache untouched
    C().toggleDone('g:arzt');
    expect(C().googleDone).toEqual({});
  });

  it('finds the next exam from today on', async () => {
    await C().add({ date: '2026-09-01', title: 'alt', kind: 'exam' });
    await C().add({ date: '2026-12-01', title: 'Goethe A2', kind: 'exam' });
    useCalendar.setState({ google: { status: 'on', events: [remote('b1', '2026-11-02', { title: '🎓 Goethe B1' })] } });
    expect(nextExam(C(), '2026-09-26')?.title).toBe('🎓 Goethe B1');
  });

  it('copies to Google when connected and remembers the Google id', async () => {
    vi.spyOn(g, 'hasToken').mockReturnValue(true);
    const create = vi.spyOn(g, 'createEvent').mockResolvedValue({ id: 'new1', htmlLink: 'https://calendar.google.com/e', start: {} });
    const e = await C().add({ date: '2026-10-01', title: 'Prüfung', kind: 'exam' }, { toGoogle: true });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Prüfung', kind: 'exam' }));
    expect(e.googleId).toBe('new1');
    expect(C().entries[0]).toMatchObject({ googleId: 'new1', link: 'https://calendar.google.com/e' });
  });

  it('keeps the local entry if Google rejects it, and drops to "off" on auth errors', async () => {
    vi.spyOn(g, 'hasToken').mockReturnValue(true);
    vi.spyOn(g, 'createEvent').mockRejectedValue(new g.GoogleAuthError('Google 401'));
    await C().add({ date: '2026-10-01', title: 'Kurs', kind: 'event' }, { toGoogle: true });
    expect(C().entries).toHaveLength(1);
    expect(C().google.status).toBe('off');
  });

  it('does not delete locally if deleting in Google fails', async () => {
    const e = await C().add({ date: '2026-10-01', title: 'Kurs', kind: 'event' });
    C().update(e.id, { googleId: 'k1' });
    vi.spyOn(g, 'deleteEvent').mockRejectedValue(new Error('Google Calendar 500'));
    await C().remove(e.id, true);
    expect(C().entries).toHaveLength(1);
    expect(C().google).toMatchObject({ status: 'error', error: 'Google Calendar 500' });
  });

  it('refresh replaces events in the fetched range only', async () => {
    vi.spyOn(g, 'hasToken').mockReturnValue(true);
    useCalendar.setState({ google: { status: 'on', events: [remote('old-in', '2026-09-10'), remote('keep', '2026-10-05')] } });
    vi.spyOn(g, 'listEvents').mockResolvedValue([remote('fresh', '2026-09-12')]);
    await C().refreshGoogle('2026-08-31', '2026-10-04');
    expect(C().google.events.map((e) => e.googleId).sort()).toEqual(['fresh', 'keep']);
  });
});
