import { nanoid } from 'nanoid';
import { db } from './db';
import { DEFAULT_SETTINGS, pickSettings, useSettings, type SettingsState } from '../state/settings';
import { useWindows, type WinState } from '../os/windows';
import { useBoard, type BoardState } from '../board/store';
import type { BoardItem } from '../board/types';
import { useMixer } from '../audio/mixer';
import { pickTimer, useTimer, type TimerState } from '../focus/timer';
import { useRadio } from '../media/radio';
import { migrateTodos, useCalendar, type LegacyTodo } from '../calendar/store';
import type { CalEntry } from '../calendar/types';

/** Small stores saved as one kv row each. `pick` = what to save, `load` = how to restore. */
const SIMPLE_STORES = [
  { key: 'mixer', store: useMixer, pick: () => ({ volumes: useMixer.getState().volumes, master: useMixer.getState().master }),
    load: (v: unknown) => useMixer.getState().hydrate(v as { volumes: Record<string, number>; master: number }) },
  { key: 'timer', store: useTimer, pick: () => pickTimer(useTimer.getState()),
    load: (v: unknown) => useTimer.getState().hydrate(v as Partial<TimerState>) },
  { key: 'radio', store: useRadio, pick: () => ({ tracks: useRadio.getState().tracks, current: useRadio.getState().current }),
    load: (v: unknown) => useRadio.getState().hydrate(v as { tracks: [] }) },
  // Google events themselves are never stored: they're re-fetched after connecting
  { key: 'calendar', store: useCalendar,
    pick: () => { const c = useCalendar.getState(); return { entries: c.entries, googleDone: c.googleDone, wantsGoogle: c.wantsGoogle }; },
    load: (v: unknown) => useCalendar.getState().hydrate(v as { entries: CalEntry[]; googleDone: Record<string, true>; wantsGoogle: boolean }) },
] as const;

/** Single room until multi-room lands. */
export const ROOM = 'main';
type BoardPrefs = Pick<BoardState, 'camera' | 'toolbar' | 'color' | 'size' | 'textSize' | 'fill' | 'pixelSnap' | 'stickerSprite'>;
const pickBoardPrefs = ({ camera, toolbar, color, size, textSize, fill, pixelSnap, stickerSprite }: BoardState): BoardPrefs =>
  ({ camera, toolbar, color, size, textSize, fill, pixelSnap, stickerSprite });

const KEYS = { settings: 'settings', windows: 'windows', board: 'board.prefs' } as const;
const DEBOUNCE_MS = 500;
/** items array last written to IndexedDB */
let savedItems: BoardItem[] | undefined;

/** Load saved state into the stores. Missing/broken data falls back to defaults. */
export async function hydrate() {
  try {
    const [s, w, b, items, ...simple] = await Promise.all([
      db.kv.get(KEYS.settings), db.kv.get(KEYS.windows), db.kv.get(KEYS.board),
      db.items.where('roomId').equals(ROOM).toArray(),
      ...SIMPLE_STORES.map((x) => db.kv.get(x.key)),
    ]);
    SIMPLE_STORES.forEach((x, i) => simple[i]?.value !== undefined && x.load(simple[i]!.value));
    await migrateLegacyTodos();
    if (s?.value) useSettings.getState().set({ ...DEFAULT_SETTINGS, ...(s.value as Partial<SettingsState>) });
    // windows of apps that no longer open a window (e.g. the old board placeholder) are dropped
    if (Array.isArray(w?.value)) useWindows.getState().hydrate((w.value as WinState[]).filter((win) => win.appId !== 'board'));
    const board = useBoard.getState();
    board.hydrate(items.sort((a, b) => (a.z ?? 0) - (b.z ?? 0)).map(({ roomId: _room, z: _z, ...it }) => it as BoardItem));
    savedItems = useBoard.getState().items;
    if (b?.value) board.set(b.value as Partial<BoardPrefs>);
    await collectGarbageBlobs();
  } catch (err) {
    console.warn('[lernzimmer] could not load saved state, starting fresh', err);
  }
}

/** The to-do list merged into the calendar: move old items over once, as undated tasks. */
async function migrateLegacyTodos() {
  const old = await db.kv.get(LEGACY_TODOS);
  if (!old) return;
  const todos = Array.isArray(old.value) ? (old.value as LegacyTodo[]) : [];
  for (const e of migrateTodos(todos)) await useCalendar.getState().add(e);
  await saveNow();
  await db.kv.delete(LEGACY_TODOS);
}
const LEGACY_TODOS = 'todos';

/** Delete uploaded images that neither the background nor any board item uses. */
async function collectGarbageBlobs() {
  const used = new Set<string>();
  const bg = useSettings.getState().background;
  if (bg.kind === 'blob') used.add(bg.ref);
  for (const it of useBoard.getState().items) if (it.kind === 'sticker' && it.blobId) used.add(it.blobId);
  for (const t of useRadio.getState().tracks) if (t.src.kind === 'file') used.add(t.src.blobId);
  const unused = (await db.blobs.toCollection().primaryKeys()).filter((id) => !used.has(id));
  if (unused.length) await db.blobs.bulkDelete(unused);
}


export async function saveNow() {
  const now = Date.now();
  const board = useBoard.getState();
  await db.kv.bulkPut([
    { key: KEYS.settings, value: pickSettings(useSettings.getState()), updatedAt: now },
    { key: KEYS.windows, value: useWindows.getState().windows, updatedAt: now },
    { key: KEYS.board, value: pickBoardPrefs(board), updatedAt: now },
    ...SIMPLE_STORES.map((x) => ({ key: x.key, value: x.pick(), updatedAt: now })),
  ]);
  // Items only when they changed (the store replaces the array on every edit)
  if (board.items !== savedItems) {
    const items = board.items;
    await db.transaction('rw', db.items, async () => {
      await db.items.where('roomId').equals(ROOM).delete();
      await db.items.bulkPut(items.map((it, z) => ({ ...it, roomId: ROOM, z })));
    });
    savedItems = items;
  }
}

/** Debounced autosave on every store change, plus a flush when the tab is hidden. Returns an unsubscribe. */
export function startAutosave() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void saveNow(), DEBOUNCE_MS);
  };
  const flush = () => {
    if (document.visibilityState === 'hidden') { clearTimeout(timer); void saveNow(); }
  };
  const unsubs = [
    useSettings.subscribe(schedule),
    useWindows.subscribe(schedule),
    ...SIMPLE_STORES.map((x) => (x.store.subscribe as (fn: () => void) => () => void)(schedule)),
    // ignore selection/tool churn; save on content, camera and pref changes
    useBoard.subscribe((s, prev) => {
      if (s.items !== prev.items || s.camera !== prev.camera || s.toolbar !== prev.toolbar || s.color !== prev.color
        || s.size !== prev.size || s.textSize !== prev.textSize || s.fill !== prev.fill || s.pixelSnap !== prev.pixelSnap
        || s.stickerSprite !== prev.stickerSprite) schedule();
    }),
  ];
  document.addEventListener('visibilitychange', flush);
  return () => {
    clearTimeout(timer);
    unsubs.forEach((u) => u());
    document.removeEventListener('visibilitychange', flush);
  };
}

/** Store an uploaded file; images are downscaled to at most `maxSide` px. */
export async function putImageBlob(file: File, maxSide = 1920): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  let data: Blob = file;
  if (scale < 1) {
    const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    data = await canvas.convertToBlob({ type: 'image/webp', quality: 0.9 });
  }
  bitmap.close();
  const id = nanoid(10);
  await db.blobs.put({ id, mime: data.type, data, createdAt: Date.now() });
  return id;
}
