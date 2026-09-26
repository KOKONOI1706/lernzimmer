import { useState } from 'react';
import { focusedId, useWindows } from './windows';
import { APPS, appById, openApp } from './apps';
import { Window } from './Window';
import { Taskbar } from './Taskbar';
import { useSettings } from '../state/settings';
import { useBackgroundUrl } from '../state/useBackgroundUrl';
import { Sprite } from '../ui/Sprite';
import { useT } from '../i18n';
import { Board } from '../board/Board';
import { Toolbar } from '../board/Toolbar';
import { useBoard } from '../board/store';
import { useLearn } from '../learn/store';
import { deckCounts } from '../apps/cards/DeckList';
import { openNow, useCalendar } from '../calendar/store';

/** Cards waiting today across all decks (for the desktop icon badge). */
function useCardsWaiting() {
  const s = useLearn();
  if (!s.loaded) return 0;
  return s.decks.reduce((n, d) => { const c = deckCounts(d, s.cards, s); return n + c.due + c.fresh; }, 0);
}

export function Desktop({ sessionStart, onEnd }: { sessionStart: number; onEnd: () => void }) {
  const t = useT();
  const windows = useWindows((s) => s.windows);
  const background = useSettings((s) => s.background);
  const dim = useSettings((s) => s.dim);
  const bgUrl = useBackgroundUrl(background);
  const [selected, setSelected] = useState<string>();
  const focused = focusedId(windows);
  const toolbar = useBoard((s) => s.toolbar);
  const empty = useBoard((s) => s.items.length === 0);
  const waiting = useCardsWaiting();
  const openToday = useCalendar((s) => openNow(s));

  return (
    <div className="desktop">
      {bgUrl && <img className="desktop__bg" src={bgUrl} alt="" />}
      <div className="desktop__dim" style={{ opacity: dim }} />

      <main className="desktop__area" onPointerDown={(e) => !(e.target as HTMLElement).closest('.icon') && setSelected(undefined)}>
        <Board />
        {toolbar && empty && <div className="board-empty">{t('board.empty')}</div>}
        <div className="icons" role="listbox" aria-label="Desktop">
          {APPS.filter((a) => a.desktop).map((a) => (
            <button key={a.id} className="icon" role="option" aria-selected={selected === a.id}
              onClick={(e) => (e.nativeEvent as PointerEvent).pointerType === 'touch' ? openApp(a.id) : setSelected(a.id)}
              onDoubleClick={() => openApp(a.id)}
              onKeyDown={(e) => e.key === 'Enter' && openApp(a.id)}>
              <Sprite name={a.icon} animate={false} />
              {a.id === 'cards' && waiting > 0 && <b className="icon__badge" aria-label={`${waiting}`}>{waiting > 99 ? '99+' : waiting}</b>}
              {(a.id === 'calendar' || a.id === 'todo') && openToday > 0 && <b className="icon__badge icon__badge--cal" aria-label={`${openToday}`}>{openToday}</b>}
              <span>{t(a.title)}</span>
            </button>
          ))}
        </div>

        {windows.map((w) => {
          const app = appById(w.appId);
          if (!app?.render) return null;
          return (
            <Window key={w.id} win={w} title={t(app.title)} icon={app.icon} focused={focused === w.id}>
              {app.render({ winId: w.id })}
            </Window>
          );
        })}
        {toolbar && <Toolbar />}
      </main>

      <Taskbar sessionStart={sessionStart} onEnd={onEnd} />
    </div>
  );
}
