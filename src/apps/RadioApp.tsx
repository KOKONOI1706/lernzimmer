import { useEffect, useRef, useState } from 'react';
import { defaultTitle, parseMediaUrl } from '../media/parse';
import { useRadio, type Track } from '../media/radio';
import { db } from '../data/db';
import { nanoid } from 'nanoid';
import { Sprite, type SpriteName } from '../ui/Sprite';
import { useT } from '../i18n';

const SUGGESTIONS = [
  { title: 'Lofi Girl · beats to relax/study to', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
];

const ICON: Record<Track['src']['kind'], SpriteName> = { youtube: 'music_note', spotify: 'music_note', soundcloud: 'music_note', audio: 'speaker', file: 'speaker' };
const IFRAME_ALLOW = 'autoplay; encrypted-media; picture-in-picture; clipboard-write';
const IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox';

/** Object URL for a locally stored audio file. */
function useFileUrl(blobId?: string) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blobId) return;
    let u: string | undefined, alive = true;
    void db.blobs.get(blobId).then((b) => { if (alive && b) { u = URL.createObjectURL(b.data); setUrl(u); } });
    return () => { alive = false; if (u) URL.revokeObjectURL(u); setUrl(undefined); };
  }, [blobId]);
  return url;
}

function Player({ track }: { track: Track }) {
  const src = track.src;
  const fileUrl = useFileUrl(src.kind === 'file' ? src.blobId : undefined);
  if (src.kind === 'audio' || src.kind === 'file') {
    const url = src.kind === 'audio' ? src.url : fileUrl;
    return <audio className="radio__audio" controls autoPlay loop src={url} />;
  }
  const height = src.kind === 'youtube' ? undefined : src.kind === 'spotify' ? 152 : 166;
  return (
    <iframe
      key={src.embed}
      className={`radio__frame radio__frame--${src.kind}`}
      src={src.embed}
      title={track.title}
      allow={IFRAME_ALLOW}
      sandbox={IFRAME_SANDBOX}
      referrerPolicy="strict-origin-when-cross-origin"
      loading="lazy"
      style={height ? { height } : undefined}
    />
  );
}

export function RadioApp() {
  const t = useT();
  const { tracks, current, add, remove, play } = useRadio();
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const track = tracks.find((x) => x.id === current);

  const addUrl = (raw: string, title?: string) => {
    const src = parseMediaUrl(raw);
    if (!src) { setError(true); return; }
    setError(false);
    setUrl('');
    add({ title: title ?? defaultTitle(src), src });
  };

  const addFile = async (file?: File) => {
    if (!file || !file.type.startsWith('audio/')) return;
    const blobId = nanoid(10);
    await db.blobs.put({ id: blobId, mime: file.type, data: file, createdAt: Date.now() });
    add({ title: file.name, src: { kind: 'file', blobId, mime: file.type } });
  };

  return (
    <div className="radio">
      <div className="radio__stage">
        {track ? <Player track={track} /> : (
          <div className="radio__empty"><Sprite name="music_note" scale={2} /><p>{t('radio.empty')}</p></div>
        )}
      </div>
      {track?.src.kind === 'spotify' && <p className="radio__note">{t('radio.spotifyNote')}</p>}

      <form className="radio__add" onSubmit={(e) => { e.preventDefault(); addUrl(url); }}>
        <input className="px-input" type="url" inputMode="url" value={url} placeholder={t('radio.placeholder')}
          onChange={(e) => { setUrl(e.target.value); setError(false); }} aria-invalid={error} aria-label={t('radio.placeholder')} />
        <button className="px-btn px-btn--primary" type="submit" disabled={!url.trim()}>{t('radio.add')}</button>
        <button className="px-btn" type="button" onClick={() => fileRef.current?.click()}>{t('radio.file')}</button>
        <input ref={fileRef} type="file" accept="audio/*" hidden onChange={(e) => { void addFile(e.target.files?.[0]); e.target.value = ''; }} />
      </form>
      {error && <p className="radio__error" role="alert">{t('radio.invalid')}</p>}

      <ul className="radio__list">
        {tracks.map((x) => (
          <li key={x.id} className={x.id === current ? 'is-current' : ''}>
            <button className="radio__track" onClick={() => play(x.id)} aria-current={x.id === current}>
              <Sprite name={ICON[x.src.kind]} px={2} animate={false} />
              <span>{x.title}</span>
            </button>
            <button className="win__btn" title={t('radio.remove')} aria-label={`${t('radio.remove')}: ${x.title}`} onClick={() => remove(x.id)}>
              <Sprite name="btn_close" px={2} />
            </button>
          </li>
        ))}
        {SUGGESTIONS.filter((sg) => !tracks.some((x) => x.src.kind === 'youtube' && !!x.src.id && sg.url.includes(x.src.id))).map((sg) => (
          <li key={sg.url} className="radio__suggest">
            <button className="radio__track" onClick={() => addUrl(sg.url, sg.title)}>
              <Sprite name="sparkle" px={2} animate={false} />
              <span>{t('radio.suggest')}: {sg.title}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="radio__note">{t('radio.keepOpen')}</p>
    </div>
  );
}
