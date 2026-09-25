import { useEffect, useState } from 'react';
import { focusedId, useWindows } from './windows';
import { appById, openApp } from './apps';
import { StartMenu } from './StartMenu';
import { saveNow } from '../data/persist';
import { Sprite } from '../ui/Sprite';
import { useT } from '../i18n';
import { useToast } from '../ui/toast';
import { mmss, phaseLength, timeLeft, useTimer } from '../focus/timer';
import { activeLayers, startAudio, useMixer } from '../audio/mixer';

export const formatDuration = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return [s / 3600, (s % 3600) / 60, s % 60].map((n) => String(Math.floor(n)).padStart(2, '0')).join(':');
};

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), intervalMs); return () => clearInterval(id); }, [intervalMs]);
  return now;
}

export function Taskbar({ sessionStart, onEnd }: { sessionStart: number; onEnd: () => void }) {
  const t = useT();
  const windows = useWindows((s) => s.windows);
  const taskbarClick = useWindows((s) => s.taskbarClick);
  const [menu, setMenu] = useState(false);
  const toast = useToast((s) => s.text);
  const now = useNow();
  const focused = focusedId(windows);
  const timer = useTimer();
  const timerActive = timer.running || timer.remaining !== phaseLength(timer);
  const sounds = useMixer((s) => activeLayers(s).length);
  const muted = useMixer((s) => s.muted);

  const save = async () => {
    await saveNow();
    useToast.getState().show(t('start.saved'), 1600);
  };

  return (
    <>
      {menu && <StartMenu onClose={() => setMenu(false)} onSave={save} onEnd={onEnd} />}
      <nav className="taskbar" aria-label="Taskbar">
        <button className="px-btn taskbar__start" aria-pressed={menu} aria-haspopup="menu" onClick={() => setMenu(!menu)}>
          <Sprite name="heart" px={2} />START
        </button>
        <div className="taskbar__wins">
          {windows.map((w) => {
            const app = appById(w.appId);
            if (!app?.render) return null;
            return (
              <button key={w.id} className="px-btn taskbar__win" aria-pressed={!w.minimized && focused === w.id} onClick={() => taskbarClick(w.id)}>
                <Sprite name={app.icon} px={2} animate={false} />{t(app.title)}
              </button>
            );
          })}
        </div>
        {toast && <span className="taskbar__toast" role="status">{toast}</span>}
        <div className="taskbar__tray">
          {sounds > 0 && (
            <button className="taskbar__chip" title={t('amb.mute')} aria-pressed={muted}
              onClick={() => { void startAudio(); useMixer.getState().toggleMute(); }}>
              <Sprite name="speaker" px={2} />{muted ? '✕' : sounds}
            </button>
          )}
          {timerActive && (
            <button className={`taskbar__chip ${timer.phase === 'break' ? 'is-break' : ''}`} title={t('app.focus')} onClick={() => openApp('focus')}>
              <Sprite name="tomato" px={2} />{mmss(timeLeft(timer, now))}{timer.running ? '' : ' ❚❚'}
            </button>
          )}
          <span title={t('task.session')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sprite name="clock" px={2} animate={false} />{formatDuration(now - sessionStart)}
          </span>
          <span>{new Date(now).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </nav>
    </>
  );
}
