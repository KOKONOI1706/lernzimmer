import { create } from 'zustand';
import type { Lang } from '../i18n/strings';

export const THEMES = ['aconite', 'aquarium', 'violet'] as const;
export type ThemeId = (typeof THEMES)[number];

export const BACKGROUND_PRESETS = ['berlin-night', 'aquarium'] as const;
export type Background =
  | { kind: 'preset'; ref: (typeof BACKGROUND_PRESETS)[number] }
  | { kind: 'blob'; ref: string } // id in db.blobs
  | { kind: 'none' };

export interface SettingsState {
  theme: ThemeId;
  lang: Lang;
  background: Background;
  /** 0..0.8 black overlay on the background */
  dim: number;
  /** CSS px per art pixel */
  px: 2 | 3 | 4;
  seenWelcome: boolean;
}

interface SettingsActions {
  set: (patch: Partial<SettingsState>) => void;
}

export const DEFAULT_SETTINGS: SettingsState = {
  theme: 'aconite',
  lang: 'vi',
  background: { kind: 'preset', ref: 'berlin-night' },
  dim: 0,
  px: 3,
  seenWelcome: false,
};

export const useSettings = create<SettingsState & SettingsActions>()((set) => ({
  ...DEFAULT_SETTINGS,
  set: (patch) => set(patch),
}));

/** Only the serialisable part, for persistence. */
export const pickSettings = ({ theme, lang, background, dim, px, seenWelcome }: SettingsState): SettingsState =>
  ({ theme, lang, background, dim, px, seenWelcome });
