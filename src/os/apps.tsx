import type { ReactNode } from 'react';
import type { StringKey } from '../i18n';
import type { SpriteName } from '../ui/Sprite';
import { useWindows, type OpenOptions } from './windows';
import { WelcomeApp } from '../apps/WelcomeApp';
import { SettingsApp } from '../apps/SettingsApp';
import { ComingSoon } from '../apps/ComingSoon';
import { useBoard } from '../board/store';
import { ClockApp } from '../apps/ClockApp';
import { FocusApp } from '../apps/FocusApp';
import { RadioApp } from '../apps/RadioApp';
import { AmbienceApp } from '../apps/AmbienceApp';
import { WordApp } from '../apps/WordApp';
import { TodoApp } from '../apps/TodoApp';
import { CardsApp } from '../apps/cards/CardsApp';

export interface AppDef {
  id: string;
  title: StringKey;
  icon: SpriteName;
  size: Pick<OpenOptions, 'w' | 'h'>;
  singleton?: boolean;
  /** show on the desktop as an icon */
  desktop?: boolean;
  /** window content; apps without it run `action` instead of opening a window */
  render?: (ctx: { winId: string }) => ReactNode;
  action?: () => void;
}

const soon = (icon: SpriteName, milestone: string) => () => <ComingSoon icon={icon} milestone={milestone} />;

export const APPS: AppDef[] = [
  // The board is the desktop itself; its icon shows/hides the toolbar.
  { id: 'board', title: 'app.board', icon: 'pencil', size: { w: 0, h: 0 }, desktop: true, action: () => {
    const b = useBoard.getState();
    if (b.toolbar) b.setTool('select');
    b.set({ toolbar: !b.toolbar });
  } },
  { id: 'cards', title: 'app.cards', icon: 'book', size: { w: 600, h: 640 }, singleton: true, desktop: true, render: () => <CardsApp /> },
  { id: 'arcade', title: 'app.arcade', icon: 'coin', size: { w: 560, h: 440 }, singleton: true, desktop: true, render: soon('coin', 'M5') },
  { id: 'radio', title: 'app.radio', icon: 'music_note', size: { w: 520, h: 560 }, singleton: true, desktop: true, render: () => <RadioApp /> },
  { id: 'ambience', title: 'app.ambience', icon: 'fire', size: { w: 480, h: 600 }, singleton: true, desktop: true, render: () => <AmbienceApp /> },
  { id: 'focus', title: 'app.focus', icon: 'tomato', size: { w: 400, h: 470 }, singleton: true, desktop: true, render: () => <FocusApp /> },
  { id: 'clock', title: 'app.clock', icon: 'clock', size: { w: 460, h: 560 }, singleton: true, desktop: true, render: () => <ClockApp /> },
  { id: 'word', title: 'app.word', icon: 'flag_de', size: { w: 440, h: 460 }, singleton: true, desktop: true, render: () => <WordApp /> },
  { id: 'todo', title: 'app.todo', icon: 'checklist', size: { w: 400, h: 440 }, singleton: true, desktop: true, render: () => <TodoApp /> },
  { id: 'settings', title: 'app.settings', icon: 'cursor', size: { w: 520, h: 520 }, singleton: true, desktop: true, render: () => <SettingsApp /> },
  { id: 'welcome', title: 'app.welcome', icon: 'heart', size: { w: 560, h: 470 }, singleton: true, render: ({ winId }) => <WelcomeApp winId={winId} /> },
];

export const appById = (id: string) => APPS.find((a) => a.id === id);

export function openApp(id: string) {
  const app = appById(id);
  if (!app) return;
  if (app.action) return void app.action();
  // fit into small screens
  const w = Math.min(app.size.w, window.innerWidth - 32);
  const h = Math.min(app.size.h, window.innerHeight - 96);
  return useWindows.getState().open(id, { w, h, singleton: app.singleton });
}
