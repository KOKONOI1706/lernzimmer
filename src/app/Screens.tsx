import { useEffect } from 'react';
import { presetUrl } from '../state/useBackgroundUrl';
import { Sprite } from '../ui/Sprite';
import { formatDuration } from '../os/Taskbar';
import { useT } from '../i18n';

/** "Press START": the first user gesture also unlocks audio for later milestones. */
export function Splash({ onStart }: { onStart: () => void }) {
  const t = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && onStart();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <div className="screen" onClick={onStart}>
      <img className="screen__bg" src={presetUrl('berlin-night')} alt="" />
      <Sprite name="heart" scale={4} />
      <h1 className="screen__logo">LERN<span>ZIMMER</span></h1>
      <p className="screen__tag">{t('splash.tagline')}</p>
      <div className="px-row" style={{ justifyContent: 'center' }}>
        <Sprite name="dachshund" scale={4} />
        <Sprite name="mug" scale={3} />
      </div>
      <button className="screen__press" autoFocus onClick={(e) => { e.stopPropagation(); onStart(); }}>▶ {t('splash.press')}</button>
      <span className="screen__hint">{t('splash.hint')}</span>
    </div>
  );
}

export function EndScreen({ elapsed, onBack }: { elapsed: number; onBack: () => void }) {
  const t = useT();
  return (
    <div className="screen" style={{ background: 'var(--scrim)', cursor: 'default' }}>
      <div className="screen__card">
        <Sprite name="dachshund" scale={4} />
        <h2>{t('end.title')}</h2>
        <p style={{ margin: 0 }}>{t('end.body')}</p>
        <div className="px-row" style={{ fontSize: 28 }}><Sprite name="clock" scale={2} animate={false} />{formatDuration(elapsed)}</div>
        <button className="px-btn px-btn--primary" autoFocus onClick={onBack}>{t('end.back')}</button>
      </div>
    </div>
  );
}
