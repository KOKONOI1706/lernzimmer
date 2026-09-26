import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { isoDate, minutesOf, type IsoDate } from './dates';
import type { CalEntry } from './types';
import * as g from './google';

export type GoogleStatus = 'off' | 'connecting' | 'on' | 'error';

interface CalState {
  /** local entries (some also copied to Google: `googleId` set) */
  entries: CalEntry[];
  /** done-ticks for Google-only events (kept locally, never written to Google) */
  googleDone: Record<string, true>;
  /** user connected before: offer "reconnect" instead of "connect" */
  wantsGoogle: boolean;
  google: { status: GoogleStatus; events: CalEntry[]; error?: string };
  selected: IsoDate;
}

export type NewEntry = Pick<CalEntry, 'title' | 'kind'> & Partial<Pick<CalEntry, 'date' | 'time' | 'endTime' | 'notes' | 'done'>>;

interface CalActions {
  add: (e: NewEntry, opts?: { toGoogle?: boolean }) => Promise<CalEntry>;
  update: (id: string, patch: Partial<CalEntry>) => void;
  toggleDone: (id: string) => void;
  /** remove finished local tasks */
  clearDoneTasks: () => void;
  /** also deletes the Google copy when `fromGoogle` is true */
  remove: (id: string, fromGoogle?: boolean) => Promise<void>;
  select: (d: IsoDate) => void;
  connectGoogle: () => Promise<void>;
  refreshGoogle: (from: IsoDate, to: IsoDate, untitled?: string) => Promise<void>;
  disconnectGoogle: () => void;
  hydrate: (s: Partial<Pick<CalState, 'entries' | 'googleDone' | 'wantsGoogle'>>) => void;
}

const sortEntries = (a: CalEntry, b: CalEntry) => minutesOf(a.time) - minutesOf(b.time) || a.title.localeCompare(b.title);

/** Everything on a day: local entries + Google events (minus Google copies of local entries), sorted by time. */
export function entriesOn(s: Pick<CalState, 'entries' | 'google' | 'googleDone'>, date: IsoDate): CalEntry[] {
  const local = s.entries.filter((e) => e.date === date);
  const copied = new Set(local.map((e) => e.googleId).filter(Boolean));
  const remote = s.google.events
    .filter((e) => e.date === date && !copied.has(e.googleId))
    .map((e) => (s.googleDone[e.googleId!] ? { ...e, done: true } : e));
  return [...local, ...remote].sort(sortEntries);
}

/** Next exam from today on (local exams, or Google events marked with 🎓). */
export function nextExam(s: Pick<CalState, 'entries' | 'google'>, today = isoDate(new Date())): CalEntry | undefined {
  return [...s.entries.filter((e) => e.kind === 'exam'), ...s.google.events.filter((e) => e.title.startsWith('🎓'))]
    .filter((e) => !!e.date && e.date >= today)
    .sort((a, b) => a.date!.localeCompare(b.date!))[0];
}

export interface TaskBuckets { overdue: CalEntry[]; today: CalEntry[]; upcoming: CalEntry[]; someday: CalEntry[]; done: CalEntry[] }

/** Local tasks grouped for the to-do list. Dated tasks are sorted by date and time; someday tasks keep their order. */
export function taskBuckets(s: Pick<CalState, 'entries'>, today = isoDate(new Date())): TaskBuckets {
  const tasks = s.entries.filter((e) => e.kind === 'task');
  const byDate = (a: CalEntry, b: CalEntry) => (a.date ?? '').localeCompare(b.date ?? '') || sortEntries(a, b);
  const open = tasks.filter((e) => !e.done);
  return {
    overdue: open.filter((e) => e.date && e.date < today).sort(byDate),
    today: open.filter((e) => e.date === today).sort(byDate),
    upcoming: open.filter((e) => e.date && e.date > today).sort(byDate),
    someday: open.filter((e) => !e.date),
    done: tasks.filter((e) => e.done),
  };
}

/** Open tasks that need attention now: overdue + due today (desktop badge). */
export const openNow = (s: Pick<CalState, 'entries'>, today = isoDate(new Date())) =>
  s.entries.filter((e) => e.kind === 'task' && !e.done && e.date && e.date <= today).length;

/** Items from the old stand-alone to-do list (before it merged into the calendar). */
export interface LegacyTodo { id: string; text: string; done: boolean }
export const migrateTodos = (todos: LegacyTodo[]): NewEntry[] =>
  todos.filter((t) => t.text?.trim()).map((t) => ({ title: t.text.trim(), kind: 'task', done: !!t.done }));

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const useCalendar = create<CalState & CalActions>()((set, get) => ({
  entries: [],
  googleDone: {},
  wantsGoogle: false,
  google: { status: 'off', events: [] },
  selected: isoDate(new Date()),

  add: async (e, { toGoogle = false } = {}) => {
    const entry: CalEntry = { id: nanoid(10), done: false, source: 'local', ...e, title: e.title.trim() };
    set((s) => ({ entries: [...s.entries, entry] }));
    // only dated entries can go to Google
    if (toGoogle && entry.date && g.hasToken()) {
      try {
        const created = await g.createEvent({ ...entry, date: entry.date });
        get().update(entry.id, { googleId: created.id, link: created.htmlLink });
        return { ...entry, googleId: created.id, link: created.htmlLink };
      } catch (err) {
        // the local entry stays; surface the problem
        set((s) => ({ google: { ...s.google, status: err instanceof g.GoogleAuthError ? 'off' : 'error', error: errMsg(err) } }));
      }
    }
    return entry;
  },

  update: (id, patch) => set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

  toggleDone: (id) => {
    const local = get().entries.find((e) => e.id === id);
    if (local) return get().update(id, { done: !local.done });
    const remote = get().google.events.find((e) => e.id === id);
    if (!remote?.googleId) return;
    set((s) => {
      const googleDone = { ...s.googleDone };
      if (googleDone[remote.googleId!]) delete googleDone[remote.googleId!];
      else googleDone[remote.googleId!] = true;
      return { googleDone };
    });
  },

  clearDoneTasks: () => set((s) => ({ entries: s.entries.filter((e) => !(e.kind === 'task' && e.done)) })),

  remove: async (id, fromGoogle = false) => {
    const s = get();
    const entry = s.entries.find((e) => e.id === id) ?? s.google.events.find((e) => e.id === id);
    if (!entry) return;
    if (fromGoogle && entry.googleId) {
      try { await g.deleteEvent(entry.googleId); } catch (err) {
        set((st) => ({ google: { ...st.google, status: err instanceof g.GoogleAuthError ? 'off' : 'error', error: errMsg(err) } }));
        return; // keep it until Google agrees, so it can't silently reappear
      }
    }
    set((st) => ({
      entries: st.entries.filter((e) => e.id !== id),
      google: { ...st.google, events: st.google.events.filter((e) => e.id !== id && (!fromGoogle || e.googleId !== entry.googleId)) },
    }));
  },

  select: (selected) => set({ selected }),

  connectGoogle: async () => {
    set((s) => ({ google: { ...s.google, status: 'connecting', error: undefined } }));
    try {
      await g.connect();
      set((s) => ({ wantsGoogle: true, google: { ...s.google, status: 'on' } }));
    } catch (err) {
      set((s) => ({ google: { ...s.google, status: 'error', error: errMsg(err) } }));
    }
  },

  refreshGoogle: async (from, to, untitled) => {
    if (!g.hasToken()) { if (get().google.status === 'on') set((s) => ({ google: { ...s.google, status: 'off' } })); return; }
    try {
      const events = await g.listEvents(from, to, untitled);
      set((s) => ({ google: { status: 'on', events: [...s.google.events.filter((e) => !e.date || e.date < from || e.date > to), ...events] } }));
    } catch (err) {
      set((s) => ({ google: { ...s.google, status: err instanceof g.GoogleAuthError ? 'off' : 'error', error: errMsg(err) } }));
    }
  },

  disconnectGoogle: () => {
    g.disconnect();
    set({ wantsGoogle: false, google: { status: 'off', events: [] } });
  },

  hydrate: (s) => set(s),
}));
