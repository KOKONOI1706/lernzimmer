import { create } from 'zustand';

export type Phase = 'focus' | 'break';

/** 90 000 ms → "01:30" (rounds up, so a running timer never shows 00:00 early). */
export const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export interface TimerState {
  phase: Phase;
  running: boolean;
  /** wall-clock end while running */
  endsAt?: number;
  /** ms left while paused */
  remaining: number;
  focusMin: number;
  breakMin: number;
  /** start the next phase automatically */
  autoNext: boolean;
  /** completed focus sessions per local day, e.g. { '2026-09-25': 3 } */
  history: Record<string, number>;
}

export const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const minutes = (m: number) => m * 60_000;
export const phaseLength = (s: Pick<TimerState, 'phase' | 'focusMin' | 'breakMin'>) => minutes(s.phase === 'focus' ? s.focusMin : s.breakMin);

/** Time left in ms at `now`. */
export const timeLeft = (s: TimerState, now: number) => (s.running && s.endsAt ? Math.max(0, s.endsAt - now) : s.remaining);

export type TimerEvent = 'focusDone' | 'breakDone' | null;

/** Pure step: if the running phase has ended, switch phase (and count a finished focus session). */
export function advance(s: TimerState, now: number): { state: TimerState; event: TimerEvent } {
  if (!s.running || !s.endsAt || now < s.endsAt) return { state: s, event: null };
  const event: TimerEvent = s.phase === 'focus' ? 'focusDone' : 'breakDone';
  const history = event === 'focusDone' ? { ...s.history, [dayKey(s.endsAt)]: (s.history[dayKey(s.endsAt)] ?? 0) + 1 } : s.history;
  const phase: Phase = s.phase === 'focus' ? 'break' : 'focus';
  const len = phaseLength({ ...s, phase });
  const state: TimerState = s.autoNext
    ? { ...s, phase, history, running: true, endsAt: s.endsAt + len, remaining: len }
    : { ...s, phase, history, running: false, endsAt: undefined, remaining: len };
  return { state, event };
}

interface TimerActions {
  start: (now?: number) => void;
  pause: (now?: number) => void;
  reset: () => void;
  skip: () => void;
  configure: (p: Partial<Pick<TimerState, 'focusMin' | 'breakMin' | 'autoNext'>>) => void;
  /** returns the event if a phase just ended */
  tick: (now?: number) => TimerEvent;
  hydrate: (s: Partial<TimerState>) => void;
}

export const DEFAULT_TIMER: TimerState = {
  phase: 'focus', running: false, remaining: minutes(25), focusMin: 25, breakMin: 5, autoNext: false, history: {},
};

export const useTimer = create<TimerState & TimerActions>()((set, get) => ({
  ...DEFAULT_TIMER,
  start: (now = Date.now()) => set((s) => (s.running ? s : { running: true, endsAt: now + s.remaining })),
  pause: (now = Date.now()) => set((s) => (s.running ? { running: false, remaining: timeLeft(s, now), endsAt: undefined } : s)),
  reset: () => set((s) => ({ running: false, endsAt: undefined, remaining: phaseLength(s) })),
  skip: () => set((s) => {
    const phase: Phase = s.phase === 'focus' ? 'break' : 'focus';
    return { phase, running: false, endsAt: undefined, remaining: phaseLength({ ...s, phase }) };
  }),
  configure: (p) => set((s) => {
    const next = { ...s, ...p };
    // changing a duration resets the current phase if it isn't running
    return s.running ? p : { ...p, remaining: phaseLength(next) };
  }),
  tick: (now = Date.now()) => {
    const { state, event } = advance(get(), now);
    if (event) set(state);
    return event;
  },
  hydrate: (s) => set(s),
}));

export const pickTimer = ({ phase, running, endsAt, remaining, focusMin, breakMin, autoNext, history }: TimerState): TimerState =>
  ({ phase, running, endsAt, remaining, focusMin, breakMin, autoNext, history });
