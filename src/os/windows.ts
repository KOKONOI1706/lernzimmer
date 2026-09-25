import { create } from 'zustand';
import { nanoid } from 'nanoid';

export interface Rect { x: number; y: number; w: number; h: number }

export interface WinState extends Rect {
  id: string;
  appId: string;
  z: number;
  minimized: boolean;
  maximized: boolean;
}

export interface OpenOptions {
  w: number;
  h: number;
  x?: number;
  y?: number;
  /** focus the existing window instead of opening a second one */
  singleton?: boolean;
}

interface WindowsStore {
  windows: WinState[];
  topZ: number;
  open: (appId: string, opts: OpenOptions) => string;
  close: (id: string) => void;
  focus: (id: string) => void;
  move: (id: string, x: number, y: number) => void;
  resize: (id: string, w: number, h: number) => void;
  minimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  /** taskbar click: restore if minimized, minimize if already focused, else focus */
  taskbarClick: (id: string) => void;
  hydrate: (windows: WinState[]) => void;
}

export const MIN_W = 160;
export const MIN_H = 96;
const CASCADE = 24;

const patch = (list: WinState[], id: string, p: Partial<WinState>) => list.map((w) => (w.id === id ? { ...w, ...p } : w));

/** Window with the highest z that is not minimized. */
export const focusedId = (windows: WinState[]) =>
  windows.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]?.id;

export const useWindows = create<WindowsStore>()((set, get) => ({
  windows: [],
  topZ: 0,

  open: (appId, { w, h, x, y, singleton }) => {
    if (singleton) {
      const existing = get().windows.find((win) => win.appId === appId);
      if (existing) {
        set((s) => ({ topZ: s.topZ + 1, windows: patch(s.windows, existing.id, { minimized: false, z: s.topZ + 1 }) }));
        return existing.id;
      }
    }
    const id = nanoid(8);
    set((s) => {
      const n = s.windows.length % 8;
      const win: WinState = {
        id, appId, w: Math.max(w, MIN_W), h: Math.max(h, MIN_H),
        x: x ?? 48 + n * CASCADE, y: y ?? 32 + n * CASCADE,
        z: s.topZ + 1, minimized: false, maximized: false,
      };
      return { topZ: s.topZ + 1, windows: [...s.windows, win] };
    });
    return id;
  },

  close: (id) => set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

  focus: (id) => set((s) => {
    const win = s.windows.find((w) => w.id === id);
    if (!win || (win.z === s.topZ && !win.minimized)) return s;
    return { topZ: s.topZ + 1, windows: patch(s.windows, id, { z: s.topZ + 1, minimized: false }) };
  }),

  move: (id, x, y) => set((s) => ({ windows: patch(s.windows, id, { x, y }) })),

  resize: (id, w, h) => set((s) => ({ windows: patch(s.windows, id, { w: Math.max(MIN_W, w), h: Math.max(MIN_H, h) }) })),

  minimize: (id) => set((s) => ({ windows: patch(s.windows, id, { minimized: true }) })),

  toggleMaximize: (id) => set((s) => {
    const win = s.windows.find((w) => w.id === id);
    return win ? { topZ: s.topZ + 1, windows: patch(s.windows, id, { maximized: !win.maximized, z: s.topZ + 1 }) } : s;
  }),

  taskbarClick: (id) => {
    const { windows, minimize, focus } = get();
    const win = windows.find((w) => w.id === id);
    if (!win) return;
    if (!win.minimized && focusedId(windows) === id) minimize(id);
    else focus(id);
  },

  hydrate: (windows) => set({ windows, topZ: Math.max(0, ...windows.map((w) => w.z)) }),
}));
