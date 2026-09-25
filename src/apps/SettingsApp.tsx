import { useRef } from 'react';
import { BACKGROUND_PRESETS, THEMES, useSettings, type ThemeId } from '../state/settings';
import { presetUrl, useBackgroundUrl } from '../state/useBackgroundUrl';
import { db } from '../data/db';
import { putImageBlob } from '../data/persist';
import { dictionaries, LANGS } from '../i18n/strings';
import { useT } from '../i18n';

/** Colours used for the little theme preview swatches. */
const SWATCH: Record<ThemeId, { bar: string; body: string }> = {
  aconite: { bar: '#1f4fd1', body: '#f4efe6' },
  aquarium: { bar: '#3fd0ff', body: '#0a1a4a' },
  violet: { bar: '#8b5cf6', body: '#0d0b1e' },
};

export function SettingsApp() {
  const t = useT();
  const s = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadedUrl = useBackgroundUrl(s.background);

  const onUpload = async (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const previous = s.background.kind === 'blob' ? s.background.ref : undefined;
    const id = await putImageBlob(file);
    s.set({ background: { kind: 'blob', ref: id } });
    if (previous) await db.blobs.delete(previous);
  };

  return (
    <div>
      <fieldset className="px-field">
        <legend>{t('settings.theme')}</legend>
        <div className="px-row">
          {THEMES.map((id) => (
            <button key={id} className="px-btn swatch" aria-pressed={s.theme === id} onClick={() => s.set({ theme: id })}>
              <span className="swatch__preview" style={{ background: SWATCH[id].body }}>
                <span style={{ background: SWATCH[id].bar }} />
              </span>
              {t(`theme.${id}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="px-field">
        <legend>{t('settings.language')}</legend>
        <div className="px-row">
          {LANGS.map((l) => (
            <button key={l} className="px-btn" aria-pressed={s.lang === l} onClick={() => s.set({ lang: l })}>
              {dictionaries[l]['lang.name']}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="px-field">
        <legend>{t('settings.background')}</legend>
        <div className="px-row">
          {BACKGROUND_PRESETS.map((ref) => (
            <button key={ref} className="px-btn bgthumb" title={ref} aria-label={ref}
              aria-pressed={s.background.kind === 'preset' && s.background.ref === ref}
              onClick={() => s.set({ background: { kind: 'preset', ref } })}>
              <img src={presetUrl(ref)} alt="" />
            </button>
          ))}
          {s.background.kind === 'blob' && uploadedUrl && (
            <button className="px-btn bgthumb" aria-pressed aria-label={t('settings.upload')}><img src={uploadedUrl} alt="" /></button>
          )}
          <button className="px-btn" aria-pressed={s.background.kind === 'none'} onClick={() => s.set({ background: { kind: 'none' } })}>
            {t('settings.none')}
          </button>
          <button className="px-btn" onClick={() => fileRef.current?.click()}>{t('settings.upload')}</button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void onUpload(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        <label className="px-label" style={{ marginTop: 8 }}>
          {t('settings.dim')} · {Math.round(s.dim * 100)}%
          <input className="px-range" type="range" min={0} max={0.8} step={0.05} value={s.dim}
            onChange={(e) => s.set({ dim: Number(e.target.value) })} />
        </label>
      </fieldset>

      <fieldset className="px-field">
        <legend>{t('settings.scale')}</legend>
        <div className="px-row">
          {([2, 3, 4] as const).map((px) => (
            <button key={px} className="px-btn" aria-pressed={s.px === px} onClick={() => s.set({ px })}>{px}×</button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
