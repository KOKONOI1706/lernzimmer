import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { entriesOn, migrateTodos, openNow, taskBuckets, useCalendar } from './store';
import { db } from '../data/db';
import { hydrate } from '../data/persist';

const C = () => useCalendar.getState();
const TODAY = '2026-09-26';

beforeEach(async () => {
  await db.kv.clear();
  useCalendar.setState({ entries: [], googleDone: {}, wantsGoogle: false, google: { status: 'off', events: [] } });
});

describe('tasks in the calendar', () => {
  it('groups tasks into overdue / today / upcoming / someday / done', async () => {
    await C().add({ title: 'alt', kind: 'task', date: '2026-09-20' });
    await C().add({ title: 'heute spät', kind: 'task', date: TODAY, time: '20:00' });
    await C().add({ title: 'heute', kind: 'task', date: TODAY });
    await C().add({ title: 'bald', kind: 'task', date: '2026-10-01' });
    await C().add({ title: 'irgendwann', kind: 'task' });
    await C().add({ title: 'fertig', kind: 'task', date: '2026-09-20', done: true });
    await C().add({ title: 'Kurs', kind: 'event', date: TODAY }); // not a task
    const b = taskBuckets(C(), TODAY);
    const titles = (xs: { title: string }[]) => xs.map((x) => x.title);
    expect(titles(b.overdue)).toEqual(['alt']);
    expect(titles(b.today)).toEqual(['heute', 'heute spät']);
    expect(titles(b.upcoming)).toEqual(['bald']);
    expect(titles(b.someday)).toEqual(['irgendwann']);
    expect(titles(b.done)).toEqual(['fertig']);
    expect(openNow(C(), TODAY)).toBe(3); // overdue + today, not someday/upcoming
  });

  it('undated tasks never appear on a calendar day, dating one puts it there', async () => {
    const e = await C().add({ title: 'Vokabeln', kind: 'task' });
    expect(entriesOn(C(), TODAY)).toEqual([]);
    C().update(e.id, { date: TODAY });
    expect(entriesOn(C(), TODAY).map((x) => x.title)).toEqual(['Vokabeln']);
  });

  it('clearDoneTasks removes only finished tasks', async () => {
    await C().add({ title: 'a', kind: 'task', done: true });
    await C().add({ title: 'b', kind: 'task' });
    await C().add({ title: 'Termin', kind: 'event', date: TODAY, done: true });
    C().clearDoneTasks();
    expect(C().entries.map((e) => e.title)).toEqual(['b', 'Termin']);
  });

  it('maps legacy to-dos to undated tasks', () => {
    expect(migrateTodos([{ id: '1', text: ' Artikel lernen ', done: false }, { id: '2', text: '', done: false }, { id: '3', text: 'x', done: true }]))
      .toEqual([{ title: 'Artikel lernen', kind: 'task', done: false }, { title: 'x', kind: 'task', done: true }]);
  });

  it('migrates the old to-do list once on startup', async () => {
    await db.kv.put({ key: 'todos', value: [{ id: 'a', text: 'Hausaufgaben', done: false }], updatedAt: 0 });
    await hydrate();
    expect(C().entries.map((e) => [e.title, e.kind, e.date])).toEqual([['Hausaufgaben', 'task', undefined]]);
    expect(await db.kv.get('todos')).toBeUndefined();
    // saved into the calendar row, and not duplicated on the next start
    useCalendar.setState({ entries: [] });
    await hydrate();
    expect(C().entries.map((e) => e.title)).toEqual(['Hausaufgaben']);
  });
});
