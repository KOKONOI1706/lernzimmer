import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { MediaSource } from './parse';

/** A local audio file stored in db.blobs. */
export type FileSource = { kind: 'file'; blobId: string; mime: string };
export interface Track { id: string; title: string; src: MediaSource | FileSource }

interface RadioState {
  tracks: Track[];
  current?: string;
  add: (t: Omit<Track, 'id'>) => string;
  remove: (id: string) => void;
  play: (id: string) => void;
  hydrate: (s: Partial<Pick<RadioState, 'tracks' | 'current'>>) => void;
}

export const useRadio = create<RadioState>()((set) => ({
  tracks: [],
  add: (t) => {
    const id = nanoid(8);
    set((s) => ({ tracks: [...s.tracks, { ...t, id }], current: id }));
    return id;
  },
  remove: (id) => set((s) => ({ tracks: s.tracks.filter((t) => t.id !== id), current: s.current === id ? undefined : s.current })),
  play: (id) => set({ current: id }),
  hydrate: (s) => set(s),
}));
