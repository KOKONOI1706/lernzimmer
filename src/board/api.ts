import type { Pt } from './geometry';

/** Imperative hooks the mounted Board registers so the toolbar can reach the stage. */
export const boardApi: {
  center: () => Pt;
  exportPng: () => Promise<void>;
  addImageFile: (file: File, at?: Pt) => Promise<void>;
} = {
  center: () => ({ x: 0, y: 0 }),
  exportPng: async () => {},
  addImageFile: async () => {},
};
