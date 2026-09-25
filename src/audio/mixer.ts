import { create } from 'zustand';
import { audio } from './engine';
import { layerById, PRESETS } from './layers';

export interface MixerState {
  /** layer id → volume 0..1 (0 = off) */
  volumes: Record<string, number>;
  master: number;
  muted: boolean;
  /** recorded layers whose file isn't downloaded yet */
  unavailable: Record<string, true>;
}

interface MixerActions {
  setVolume: (id: string, v: number) => void;
  toggle: (id: string) => void;
  applyPreset: (id: string) => void;
  stopAll: () => void;
  setMaster: (v: number) => void;
  toggleMute: () => void;
  hydrate: (s: Partial<Pick<MixerState, 'volumes' | 'master'>>) => void;
}

const DEFAULT_ON = 0.5;
/** remembers the last non-zero volume so toggling back restores it */
const lastOn: Record<string, number> = {};

export const useMixer = create<MixerState & MixerActions>()((set, get) => ({
  volumes: {},
  master: 0.8,
  muted: false,
  unavailable: {},

  setVolume: (id, v) => {
    if (v > 0) lastOn[id] = v;
    set((s) => ({ volumes: { ...s.volumes, [id]: v } }));
  },
  toggle: (id) => {
    const cur = get().volumes[id] ?? 0;
    get().setVolume(id, cur > 0 ? 0 : lastOn[id] ?? DEFAULT_ON);
  },
  applyPreset: (id) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    const { unavailable } = get();
    // skip recordings that aren't downloaded; the procedural parts still make a nice mix
    const volumes = Object.fromEntries(Object.entries(p.volumes).filter(([l]) => layerById(l) && !unavailable[l]));
    set({ volumes, muted: false });
  },
  stopAll: () => set({ volumes: {} }),
  setMaster: (master) => set({ master }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  hydrate: (s) => set(s),
}));

export const activeLayers = (s: MixerState) => Object.entries(s.volumes).filter(([, v]) => v > 0).map(([id]) => id);

/** Push store state into the audio engine (call after unlock and on every change). */
function sync(s: MixerState, prev?: MixerState) {
  if (!audio.unlocked) return;
  audio.setMaster(s.muted ? 0 : s.master);
  const ids = new Set([...Object.keys(s.volumes), ...Object.keys(prev?.volumes ?? {})]);
  for (const id of ids) {
    const v = s.volumes[id] ?? 0;
    if (!prev || (prev.volumes[id] ?? 0) !== v) audio.setLayer(id, v);
  }
}

audio.onUnavailable = (id) => useMixer.setState((s) => ({
  unavailable: { ...s.unavailable, [id]: true },
  volumes: { ...s.volumes, [id]: 0 },
}));
useMixer.subscribe((s, prev) => sync(s, prev));

/** Call from a user gesture (START). Resumes audio and starts whatever was playing last time. */
export async function startAudio() {
  await audio.unlock();
  sync(useMixer.getState());
}

/** HEAD-check which recorded loops exist, so the UI can grey out missing ones. */
export async function probeRecorded(urls: { id: string; url: string }[]) {
  const missing: Record<string, true> = {};
  await Promise.all(urls.map(async ({ id, url }) => {
    try {
      const r = await fetch(url, { method: 'HEAD' });
      if (!r.ok || !(r.headers.get('content-type') ?? '').startsWith('audio')) missing[id] = true;
    } catch { missing[id] = true; }
  }));
  useMixer.setState({ unavailable: missing });
}
