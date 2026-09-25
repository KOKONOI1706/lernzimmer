import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { BoardItem, Camera, Tool } from './types';
import { INK_COLORS, SIZES } from './types';

const HISTORY_LIMIT = 100;
const DEFAULT_STICKER = 'pretzel';

type NewItem = BoardItem extends infer T ? (T extends BoardItem ? Omit<T, 'id'> & { id?: string } : never) : never;

export interface BoardState {
  items: BoardItem[];
  selected: string[];
  /** id of the text/note being edited in the overlay */
  editing?: string;
  tool: Tool;
  color: string;
  size: number;
  textSize: number;
  fill: boolean;
  /** snap pen points to a grid of the pen size (pixel-art drawing) */
  pixelSnap: boolean;
  /** built-in sprite chosen in the sticker picker */
  stickerSprite?: string;
  toolbar: boolean;
  camera: Camera;
  past: BoardItem[][];
  future: BoardItem[][];
}

interface BoardActions {
  /** Push the current items onto the undo stack. Call once before a live change (drag, draw…). */
  checkpoint: () => void;
  /** Drop the last checkpoint (e.g. a shape that was too small to keep). */
  discardCheckpoint: () => void;
  add: (item: NewItem, opts?: { record?: boolean; select?: boolean }) => string;
  update: (id: string, patch: Partial<BoardItem>) => void;
  updateMany: (patches: Record<string, Partial<BoardItem>>) => void;
  remove: (ids: string[]) => void;
  duplicate: (ids: string[]) => void;
  toFront: (ids: string[]) => void;
  toBack: (ids: string[]) => void;
  select: (ids: string[]) => void;
  setEditing: (id?: string) => void;
  setTool: (tool: Tool) => void;
  set: (patch: Partial<Pick<BoardState, 'color' | 'size' | 'textSize' | 'fill' | 'pixelSnap' | 'stickerSprite' | 'toolbar' | 'camera'>>) => void;
  undo: () => void;
  redo: () => void;
  hydrate: (items: BoardItem[], camera?: Camera) => void;
}

const pushPast = (past: BoardItem[][], items: BoardItem[]) => [...past, items].slice(-HISTORY_LIMIT);

export const useBoard = create<BoardState & BoardActions>()((set, get) => ({
  items: [],
  selected: [],
  tool: 'select',
  color: INK_COLORS[0],
  size: SIZES.pen[1],
  textSize: SIZES.text[1],
  fill: false,
  pixelSnap: false,
  toolbar: true,
  camera: { x: 0, y: 0, zoom: 1 },
  past: [],
  future: [],

  checkpoint: () => set((s) => ({ past: pushPast(s.past, s.items), future: [] })),
  discardCheckpoint: () => set((s) => ({ past: s.past.slice(0, -1) })),

  add: (item, { record = true, select = false } = {}) => {
    const id = item.id ?? nanoid(10);
    set((s) => ({
      ...(record ? { past: pushPast(s.past, s.items), future: [] } : {}),
      items: [...s.items, { ...item, id } as BoardItem],
      ...(select ? { selected: [id] } : {}),
    }));
    return id;
  },

  update: (id, patch) => set((s) => ({ items: s.items.map((it) => (it.id === id ? ({ ...it, ...patch } as BoardItem) : it)) })),

  updateMany: (patches) => set((s) => ({ items: s.items.map((it) => (patches[it.id] ? ({ ...it, ...patches[it.id] } as BoardItem) : it)) })),

  remove: (ids) => {
    if (!ids.length) return;
    const gone = new Set(ids);
    set((s) => ({
      past: pushPast(s.past, s.items),
      future: [],
      // also forget removed items inside pins
      items: s.items.filter((it) => !gone.has(it.id)).map((it) => (it.kind === 'pin' && it.holds.some((h) => gone.has(h)) ? { ...it, holds: it.holds.filter((h) => !gone.has(h)) } : it)),
      selected: s.selected.filter((id) => !gone.has(id)),
      editing: s.editing && gone.has(s.editing) ? undefined : s.editing,
    }));
  },

  duplicate: (ids) => {
    const src = get().items.filter((it) => ids.includes(it.id));
    if (!src.length) return;
    const copies = src.map((it) => ({ ...it, id: nanoid(10), x: it.x + 24, y: it.y + 24, ...(it.kind === 'pin' ? { holds: [] } : {}) }) as BoardItem);
    set((s) => ({ past: pushPast(s.past, s.items), future: [], items: [...s.items, ...copies], selected: copies.map((c) => c.id) }));
  },

  toFront: (ids) => set((s) => ({ past: pushPast(s.past, s.items), future: [], items: [...s.items.filter((it) => !ids.includes(it.id)), ...s.items.filter((it) => ids.includes(it.id))] })),
  toBack: (ids) => set((s) => ({ past: pushPast(s.past, s.items), future: [], items: [...s.items.filter((it) => ids.includes(it.id)), ...s.items.filter((it) => !ids.includes(it.id))] })),

  select: (ids) => set({ selected: ids }),
  setEditing: (id) => set({ editing: id }),
  setTool: (tool) => set({
    tool,
    selected: tool === 'select' ? get().selected : [],
    editing: undefined,
    ...(tool === 'sticker' && !get().stickerSprite ? { stickerSprite: DEFAULT_STICKER } : {}),
  }),
  set: (patch) => set(patch),

  undo: () => set((s) => {
    const prev = s.past[s.past.length - 1];
    if (!prev) return s;
    return { past: s.past.slice(0, -1), future: [s.items, ...s.future], items: prev, selected: [], editing: undefined };
  }),
  redo: () => set((s) => {
    const [next, ...rest] = s.future;
    if (!next) return s;
    return { past: pushPast(s.past, s.items), future: rest, items: next, selected: [], editing: undefined };
  }),

  hydrate: (items, camera) => set({ items, ...(camera ? { camera } : {}), past: [], future: [], selected: [] }),
}));
