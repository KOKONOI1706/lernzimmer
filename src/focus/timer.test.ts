import { beforeEach, describe, expect, it } from 'vitest';
import { advance, dayKey, DEFAULT_TIMER, timeLeft, useTimer } from './timer';

const MIN = 60_000;
const T0 = new Date(2026, 8, 25, 14, 0, 0).getTime();
const t = () => useTimer.getState();

beforeEach(() => useTimer.setState({ ...DEFAULT_TIMER, history: {} }));

describe('focus timer', () => {
  it('counts down from wall-clock time and pauses exactly', () => {
    t().start(T0);
    expect(timeLeft(t(), T0 + 10 * MIN)).toBe(15 * MIN);
    t().pause(T0 + 10 * MIN);
    expect(timeLeft(t(), T0 + 60 * MIN)).toBe(15 * MIN); // paused: time doesn't move
    t().start(T0 + 60 * MIN);
    expect(timeLeft(t(), T0 + 70 * MIN)).toBe(5 * MIN);
  });

  it('finishing a focus session counts it and switches to a paused break', () => {
    t().start(T0);
    expect(t().tick(T0 + 25 * MIN - 1)).toBeNull();
    expect(t().tick(T0 + 25 * MIN)).toBe('focusDone');
    expect(t()).toMatchObject({ phase: 'break', running: false, remaining: 5 * MIN });
    expect(t().history[dayKey(T0)]).toBe(1);
  });

  it('autoNext chains phases from the scheduled end, not from when we noticed', () => {
    useTimer.setState({ autoNext: true });
    t().start(T0);
    // tab was asleep: we only tick 2 minutes after the focus ended
    expect(t().tick(T0 + 27 * MIN)).toBe('focusDone');
    expect(t()).toMatchObject({ phase: 'break', running: true });
    expect(timeLeft(t(), T0 + 27 * MIN)).toBe(3 * MIN);
  });

  it('break end does not count as a session', () => {
    const s = { ...DEFAULT_TIMER, phase: 'break' as const, running: true, endsAt: T0 };
    const { state, event } = advance(s, T0);
    expect(event).toBe('breakDone');
    expect(state.phase).toBe('focus');
    expect(state.history).toEqual({});
  });

  it('changing durations while stopped resets the phase length', () => {
    t().configure({ focusMin: 50 });
    expect(t().remaining).toBe(50 * MIN);
    t().start(T0);
    t().configure({ breakMin: 10 });
    expect(timeLeft(t(), T0)).toBe(50 * MIN);
  });

  it('skip jumps to the other phase without counting', () => {
    t().skip();
    expect(t()).toMatchObject({ phase: 'break', remaining: 5 * MIN, history: {} });
  });
});
