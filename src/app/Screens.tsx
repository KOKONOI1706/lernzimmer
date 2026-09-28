import { useEffect } from 'react';
import { presetUrl } from '../state/useBackgroundUrl';
import { Sprite } from '../ui/Sprite';
import { formatDuration } from '../os/Taskbar';
import { useT } from '../i18n';
import { THEMES, useSettings } from '../state/settings';

/** "Press START": retro arcade & synthwave aesthetic inspired by CRT monitor & cyber-retro references. */
export function Splash({ onStart }: { onStart: () => void }) {
  const t = useT();
  const theme = useSettings((s) => s.theme);
  const crt = useSettings((s) => s.crt);
  const wireframe = useSettings((s) => s.wireframe);
  const setSettings = useSettings((s) => s.set);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  const cycleTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = THEMES.indexOf(theme);
    const next = THEMES[(idx + 1) % THEMES.length];
    setSettings({ theme: next });
  };

  const toggleCrt = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSettings({ crt: !crt });
  };

  return (
    <div className="screen screen--splash" onClick={onStart}>
      {/* Background and ambient layers */}
      <img className="screen__bg" src={presetUrl('berlin-night')} alt="" />
      <div className="screen__stars" />

      {/* 3D Perspective Synthwave Wireframe Horizon Grid (Image 2) */}
      {wireframe && (
        <div className="screen__grid-wrap">
          <div className="screen__grid" />
          <div className="screen__horizon-glow" />
        </div>
      )}

      {/* Retro Arcade HUD (Image 2: Unlimited hearts & battery status) */}
      <header className="screen__hud">
        <div className="screen__hud-hearts">
          <span className="screen__heart-icon">♥♥♥</span>
          <span className="screen__hud-label">UNLIMITED</span>
        </div>
        <div className="screen__hud-status">
          <span className="screen__hud-dot" />
          <span>LERNZIMMER OS v2.0</span>
        </div>
        <div className="screen__hud-battery" title="Battery status">
          <span>99%</span>
          <span className="screen__battery-icon">🗲</span>
        </div>
      </header>

      {/* Main Hero Content */}
      <div className="screen__content">
        <div className="screen__header">
          <div className="screen__heart-badge">
            <Sprite name="heart" scale={4} />
          </div>
          <h1 className="screen__logo">
            LERN<span>ZIMMER</span>
          </h1>
          <p className="screen__tag">{t('splash.tagline')}</p>
        </div>

        {/* Floating Sparkles (Image 2: ✦ ✧ ✦) */}
        <div className="screen__sparkles" aria-hidden="true">
          <span>✦</span>
          <span>✧</span>
          <span>✦</span>
        </div>

        {/* Mascot & study warmth */}
        <div className="screen__mascots">
          <div className="screen__mascot-brezel">
            <Sprite name="dachshund" scale={4} />
          </div>
          <div className="screen__mascot-mug">
            <Sprite name="mug" scale={3} />
          </div>
        </div>

        {/* Call to action & interactive controls */}
        <div className="screen__actions">
          <button
            className="screen__btn-primary"
            autoFocus
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
          >
            <span className="screen__play-arrow">▶</span>
            <span>{t('splash.press')}</span>
          </button>

          <div className="screen__controls">
            <button
              type="button"
              className="px-btn screen__chip-btn"
              onClick={cycleTheme}
              title={t('tray.theme')}
            >
              <span>🎨</span> {t(`theme.${theme}`)}
            </button>
            <button
              type="button"
              className={`px-btn screen__chip-btn ${crt ? 'is-active' : ''}`}
              onClick={toggleCrt}
              title={t('tray.crt')}
            >
              <span>📺</span> CRT: {crt ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <span className="screen__hint">{t('splash.hint')}</span>
      </div>
    </div>
  );
}

export function EndScreen({ elapsed, onBack }: { elapsed: number; onBack: () => void }) {
  const t = useT();
  return (
    <div className="screen screen--end" style={{ background: 'var(--scrim)', cursor: 'default' }}>
      <div className="screen__card">
        <div className="screen__sparkles" style={{ marginBottom: 4 }}>
          <span>★</span>
          <span>★</span>
          <span>★</span>
        </div>
        <Sprite name="dachshund" scale={4} />
        <h2>{t('end.title')}</h2>
        <p style={{ margin: 0 }}>{t('end.body')}</p>
        <div className="px-row" style={{ fontSize: 32, gap: 12, alignItems: 'center' }}>
          <Sprite name="clock" scale={2} animate={false} />
          <span style={{ fontFamily: 'var(--font-head)', letterSpacing: 1 }}>{formatDuration(elapsed)}</span>
        </div>
        <button className="px-btn px-btn--primary" autoFocus onClick={onBack}>
          {t('end.back')}
        </button>
      </div>
    </div>
  );
}
