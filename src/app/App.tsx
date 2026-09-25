import { useCallback, useEffect, useState } from 'react';
import { useSettings } from '../state/settings';
import { Desktop } from '../os/Desktop';
import { openApp } from '../os/apps';
import { EndScreen, Splash } from './Screens';
import { startAudio } from '../audio/mixer';
import { audio } from '../audio/engine';
import { mmss, timeLeft, useTimer } from '../focus/timer';
import { useToast } from '../ui/toast';
import { translate } from '../i18n';

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

  // Focus timer: one global ticker; phase ends chime + toast, and the tab title shows the countdown.
  useEffect(() => {
    const id = setInterval(() => {
      const event = useTimer.getState().tick();
      const lang = useSettings.getState().lang;
      if (event) {
        audio.chime('done');
        useToast.getState().show(translate(lang, event === 'focusDone' ? 'focus.doneToast' : 'focus.breakToast'), 5000);
      }
      const s = useTimer.getState();
      document.title = s.running ? `${s.phase === 'focus' ? '🍅' : '☕'} ${mmss(timeLeft(s, Date.now()))} · Lernzimmer` : 'Lernzimmer ♥';
    }, 500);
    return () => clearInterval(id);
  }, []);

  const start = useCallback(() => {
    void startAudio(); // START is the user gesture browsers require before playing sound
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
