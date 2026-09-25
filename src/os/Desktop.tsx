import { useState } from 'react';
import { focusedId, useWindows } from './windows';
import { APPS, appById, openApp } from './apps';
import { Window } from './Window';
import { Taskbar } from './Taskbar';
import { useSettings } from '../state/settings';
import { useBackgroundUrl } from '../state/useBackgroundUrl';
import { Sprite } from '../ui/Sprite';
import { useT } from '../i18n';

export function Desktop({ sessionStart, onEnd }: { sessionStart: number; onEnd: () => void }) {
  const t = useT();
  const windows = useWindows((s) => s.windows);
  const background = useSettings((s) => s.background);
  const dim = useSettings((s) => s.dim);
  const bgUrl = useBackgroundUrl(background);
  const [selected, setSelected] = useState<string>();
  const focused = focusedId(windows);

  return (
    <div className="desktop">
      {bgUrl && <img className="desktop__bg" src={bgUrl} alt="" />}
      <div className="desktop__dim" style={{ opacity: dim }} />

      <main className="desktop__area" onPointerDown={(e) => e.target === e.currentTarget && setSelected(undefined)}>
        <div className="icons" role="listbox" aria-label="Desktop">
          {APPS.filter((a) => a.desktop).map((a) => (
            <button key={a.id} className="icon" role="option" aria-selected={selected === a.id}
              onClick={(e) => (e.nativeEvent as PointerEvent).pointerType === 'touch' ? openApp(a.id) : setSelected(a.id)}
              onDoubleClick={() => openApp(a.id)}
              onKeyDown={(e) => e.key === 'Enter' && openApp(a.id)}>
              <Sprite name={a.icon} animate={false} />
              <span>{t(a.title)}</span>
            </button>
          ))}
        </div>

        {windows.map((w) => {
          const app = appById(w.appId);
          if (!app) return null;
          return (
            <Window key={w.id} win={w} title={t(app.title)} icon={app.icon} focused={focused === w.id}>
              {app.render({ winId: w.id })}
            </Window>
          );
        })}
      </main>

      <Taskbar sessionStart={sessionStart} onEnd={onEnd} />
    </div>
  );
}
