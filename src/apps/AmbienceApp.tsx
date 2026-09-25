import { useEffect } from 'react';
import { LAYERS, PRESETS, type LayerDef } from '../audio/layers';
import { probeRecorded, startAudio, useMixer } from '../audio/mixer';
import { useSettings } from '../state/settings';
import { Sprite } from '../ui/Sprite';
import { useT, type StringKey } from '../i18n';

const GROUPS: LayerDef['group'][] = ['nature', 'vietnam', 'germany', 'city', 'noise'];

export function AmbienceApp() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const m = useMixer();

  // find out which recorded loops are actually downloaded
  useEffect(() => { void probeRecorded(LAYERS.filter((l) => l.url).map((l) => ({ id: l.id, url: l.url! }))); }, []);

  // every interaction is a user gesture: make sure audio is running
  const withAudio = (fn: () => void) => () => { void startAudio(); fn(); };

  return (
    <div className="amb">
      <div className="amb__head">
        <span className="px-label" style={{ margin: 0 }}>{t('amb.presets')}</span>
        <div className="px-row">
          {PRESETS.map((p) => (
            <button key={p.id} className="px-btn" onClick={withAudio(() => m.applyPreset(p.id))}>{p.label[lang]}</button>
          ))}
          <button className="px-btn" onClick={m.stopAll}>{t('amb.stopAll')}</button>
        </div>
      </div>

      <div className="amb__master">
        <button className="px-btn" aria-pressed={m.muted} onClick={withAudio(m.toggleMute)} title={t('amb.mute')} aria-label={t('amb.mute')}>
          <Sprite name="speaker" px={2} />{m.muted ? '✕' : ''}
        </button>
        <label className="px-label" style={{ flex: 1, margin: 0 }}>
          {t('amb.master')} · {Math.round(m.master * 100)}%
          <input className="px-range" type="range" min={0} max={1} step={0.01} value={m.master} onChange={(e) => m.setMaster(Number(e.target.value))} />
        </label>
      </div>

      {GROUPS.map((g) => {
        const layers = LAYERS.filter((l) => l.group === g);
        return (
          <section key={g} className="amb__group">
            <h4 className="px-label">{t(`amb.group.${g}` as StringKey)}</h4>
            {layers.map((l) => {
              const v = m.volumes[l.id] ?? 0;
              const missing = !!m.unavailable[l.id];
              return (
                <div key={l.id} className={`amb__layer ${v > 0 ? 'is-on' : ''} ${missing ? 'is-missing' : ''}`} title={missing ? t('amb.missing') : undefined}>
                  <button className="px-btn amb__toggle" aria-pressed={v > 0} disabled={missing} onClick={withAudio(() => m.toggle(l.id))}>
                    <Sprite name={l.icon} px={2} animate={v > 0} />
                    <span>{l.label[lang]}</span>
                  </button>
                  <input className="px-range" type="range" min={0} max={1} step={0.01} value={v} disabled={missing}
                    aria-label={l.label[lang]} onChange={(e) => { void startAudio(); m.setVolume(l.id, Number(e.target.value)); }} />
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
