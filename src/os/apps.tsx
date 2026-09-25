import type { ReactNode } from 'react';
import type { StringKey } from '../i18n';
import type { SpriteName } from '../ui/Sprite';
import { useWindows, type OpenOptions } from './windows';
import { WelcomeApp } from '../apps/WelcomeApp';
import { SettingsApp } from '../apps/SettingsApp';
import { ComingSoon } from '../apps/ComingSoon';

export interface AppDef {
  id: string;
  title: StringKey;
  icon: SpriteName;
  size: Pick<OpenOptions, 'w' | 'h'>;
  singleton?: boolean;
  /** show on the desktop as an icon */
  desktop?: boolean;
  render: (ctx: { winId: string }) => ReactNode;
}

const soon = (icon: SpriteName, milestone: string) => () => <ComingSoon icon={icon} milestone={milestone} />;

export const APPS: AppDef[] = [
  { id: 'board', title: 'app.board', icon: 'pencil', size: { w: 720, h: 480 }, singleton: true, desktop: true, render: soon('pencil', 'M2') },
  { id: 'cards', title: 'app.cards', icon: 'book', size: { w: 520, h: 420 }, singleton: true, desktop: true, render: soon('book', 'M4') },
  { id: 'arcade', title: 'app.arcade', icon: 'coin', size: { w: 560, h: 440 }, singleton: true, desktop: true, render: soon('coin', 'M5') },
  { id: 'radio', title: 'app.radio', icon: 'music_note', size: { w: 420, h: 320 }, singleton: true, desktop: true, render: soon('music_note', 'M3') },
  { id: 'ambience', title: 'app.ambience', icon: 'fire', size: { w: 420, h: 340 }, singleton: true, desktop: true, render: soon('fire', 'M3') },
  { id: 'clock', title: 'app.clock', icon: 'clock', size: { w: 360, h: 300 }, singleton: true, desktop: true, render: soon('clock', 'M3') },
  { id: 'settings', title: 'app.settings', icon: 'cursor', size: { w: 520, h: 520 }, singleton: true, desktop: true, render: () => <SettingsApp /> },
  { id: 'welcome', title: 'app.welcome', icon: 'heart', size: { w: 560, h: 470 }, singleton: true, render: ({ winId }) => <WelcomeApp winId={winId} /> },
];

export const appById = (id: string) => APPS.find((a) => a.id === id);

export function openApp(id: string) {
  const app = appById(id);
  if (!app) return;
  // fit into small screens
  const w = Math.min(app.size.w, window.innerWidth - 32);
  const h = Math.min(app.size.h, window.innerHeight - 96);
  return useWindows.getState().open(id, { w, h, singleton: app.singleton });
}
