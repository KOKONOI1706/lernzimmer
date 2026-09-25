import { useCallback, useEffect, useState } from 'react';
import { useSettings } from '../state/settings';
import { Desktop } from '../os/Desktop';
import { openApp } from '../os/apps';
import { EndScreen, Splash } from './Screens';

type Phase = 'splash' | 'room' | 'end';

export function App() {
  const theme = useSettings((s) => s.theme);
  const px = useSettings((s) => s.px);
  const lang = useSettings((s) => s.lang);
  const [phase, setPhase] = useState<Phase>('splash');
  const [sessionStart, setSessionStart] = useState(Date.now());
  const [endedAt, setEndedAt] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.setProperty('--px', `${px}px`);
    root.lang = lang;
  }, [theme, px, lang]);

  const start = useCallback(() => {
    setSessionStart(Date.now());
    setPhase('room');
    if (!useSettings.getState().seenWelcome) openApp('welcome');
  }, []);

  if (phase === 'splash') return <Splash onStart={start} />;
  return (
    <>
      <Desktop sessionStart={sessionStart} onEnd={() => { setEndedAt(Date.now()); setPhase('end'); }} />
      {phase === 'end' && <EndScreen elapsed={endedAt - sessionStart} onBack={() => setPhase('room')} />}
    </>
  );
}
