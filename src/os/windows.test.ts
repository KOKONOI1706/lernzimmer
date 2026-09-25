import { beforeEach, describe, expect, it } from 'vitest';
import { focusedId, MIN_W, useWindows } from './windows';

const s = () => useWindows.getState();

beforeEach(() => useWindows.setState({ windows: [], topZ: 0 }));

describe('window manager', () => {
  it('opens windows on top, cascading', () => {
    const a = s().open('board', { w: 300, h: 200 });
    const b = s().open('cards', { w: 300, h: 200 });
    const [wa, wb] = s().windows;
    expect(wb.z).toBeGreaterThan(wa.z);
    expect(wb.x).toBeGreaterThan(wa.x);
    expect(focusedId(s().windows)).toBe(b);
    expect(a).not.toBe(b);
  });

  it('singleton apps focus the existing window instead of opening another', () => {
    const a = s().open('settings', { w: 300, h: 200, singleton: true });
    s().open('board', { w: 300, h: 200 });
    s().minimize(a);
    const again = s().open('settings', { w: 300, h: 200, singleton: true });
    expect(again).toBe(a);
    expect(s().windows).toHaveLength(2);
    expect(s().windows.find((w) => w.id === a)!.minimized).toBe(false);
    expect(focusedId(s().windows)).toBe(a);
  });

  it('focus raises a window', () => {
    const a = s().open('a', { w: 300, h: 200 });
    s().open('b', { w: 300, h: 200 });
    s().focus(a);
    expect(focusedId(s().windows)).toBe(a);
  });

  it('enforces a minimum size', () => {
    const a = s().open('a', { w: 10, h: 10 });
    s().resize(a, 5, 5);
    expect(s().windows[0].w).toBe(MIN_W);
  });

  it('taskbar click toggles minimize for the focused window and restores minimized ones', () => {
    const a = s().open('a', { w: 300, h: 200 });
    s().taskbarClick(a);
    expect(s().windows[0].minimized).toBe(true);
    expect(focusedId(s().windows)).toBeUndefined();
    s().taskbarClick(a);
    expect(s().windows[0].minimized).toBe(false);
    expect(focusedId(s().windows)).toBe(a);
  });

  it('taskbar click on a background window focuses it rather than minimizing', () => {
    const a = s().open('a', { w: 300, h: 200 });
    s().open('b', { w: 300, h: 200 });
    s().taskbarClick(a);
    expect(s().windows.find((w) => w.id === a)!.minimized).toBe(false);
    expect(focusedId(s().windows)).toBe(a);
  });

  it('hydrate restores topZ so new windows open on top', () => {
    s().hydrate([{ id: 'x', appId: 'a', x: 0, y: 0, w: 200, h: 200, z: 41, minimized: false, maximized: false }]);
    const b = s().open('b', { w: 300, h: 200 });
    expect(focusedId(s().windows)).toBe(b);
  });

  it('close removes the window', () => {
    const a = s().open('a', { w: 300, h: 200 });
    s().close(a);
    expect(s().windows).toEqual([]);
  });
});
