import { nanoid } from 'nanoid';
import { db } from './db';
import { DEFAULT_SETTINGS, pickSettings, useSettings, type SettingsState } from '../state/settings';
import { useWindows, type WinState } from '../os/windows';

const KEYS = { settings: 'settings', windows: 'windows' } as const;
const DEBOUNCE_MS = 500;

/** Load saved state into the stores. Missing/broken data falls back to defaults. */
export async function hydrate() {
  try {
    const [s, w] = await Promise.all([db.kv.get(KEYS.settings), db.kv.get(KEYS.windows)]);
    if (s?.value) useSettings.getState().set({ ...DEFAULT_SETTINGS, ...(s.value as Partial<SettingsState>) });
    if (Array.isArray(w?.value)) useWindows.getState().hydrate(w.value as WinState[]);
  } catch (err) {
    console.warn('[lernzimmer] could not load saved state, starting fresh', err);
  }
}

export async function saveNow() {
  const now = Date.now();
  await db.kv.bulkPut([
    { key: KEYS.settings, value: pickSettings(useSettings.getState()), updatedAt: now },
    { key: KEYS.windows, value: useWindows.getState().windows, updatedAt: now },
  ]);
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
  const unsubs = [useSettings.subscribe(schedule), useWindows.subscribe(schedule)];
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
