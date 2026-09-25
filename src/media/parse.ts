// Turns a pasted link into something the Radio can play. Only known embed hosts become iframes;
// everything else must be a direct audio file.

export type MediaSource =
  | { kind: 'youtube'; id: string; list?: string; embed: string }
  | { kind: 'spotify'; type: string; id: string; embed: string }
  | { kind: 'soundcloud'; url: string; embed: string }
  | { kind: 'audio'; url: string };

const AUDIO_EXT = /\.(mp3|ogg|oga|opus|wav|m4a|aac|flac|webm)(\?.*)?$/i;
const YT_ID = /^[\w-]{11}$/;
const SPOTIFY_TYPES = new Set(['track', 'album', 'playlist', 'episode', 'show', 'artist']);

export function parseMediaUrl(input: string): MediaSource | null {
  let u: URL;
  try { u = new URL(input.trim()); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.replace(/^(www|m|music)\./, '');

  // YouTube: watch?v=, youtu.be/<id>, /shorts/<id>, /embed/<id>, playlist?list=
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com') {
    const list = u.searchParams.get('list') ?? undefined;
    let id = host === 'youtu.be' ? u.pathname.slice(1).split('/')[0] : u.searchParams.get('v') ?? '';
    const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{11})/);
    if (m) id = m[2];
    const params = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' });
    if (YT_ID.test(id)) {
      if (list) params.set('list', list);
      return { kind: 'youtube', id, list, embed: `https://www.youtube-nocookie.com/embed/${id}?${params}` };
    }
    if (list && /^[\w-]+$/.test(list)) {
      params.set('list', list);
      return { kind: 'youtube', id: '', list, embed: `https://www.youtube-nocookie.com/embed/videoseries?${params}` };
    }
    return null;
  }

  // Spotify: open.spotify.com/[intl-xx/]<type>/<id>
  if (host === 'open.spotify.com') {
    const parts = u.pathname.split('/').filter(Boolean).filter((p) => !p.startsWith('intl-'));
    const [type, id] = parts[0] === 'embed' ? parts.slice(1) : parts;
    if (type && id && SPOTIFY_TYPES.has(type) && /^[A-Za-z0-9]+$/.test(id)) {
      return { kind: 'spotify', type, id, embed: `https://open.spotify.com/embed/${type}/${id}` };
    }
    return null;
  }

  // SoundCloud: any track/set page goes through the official widget
  if (host === 'soundcloud.com' || host === 'on.soundcloud.com') {
    if (u.pathname.split('/').filter(Boolean).length < 1) return null;
    const url = `https://${host}${u.pathname}`;
    const params = new URLSearchParams({ url, color: '#8b5cf6', auto_play: 'false', visual: 'false', show_comments: 'false' });
    return { kind: 'soundcloud', url, embed: `https://w.soundcloud.com/player/?${params}` };
  }

  if (AUDIO_EXT.test(u.pathname)) return { kind: 'audio', url: u.toString() };
  return null;
}

/** Short human label for a playlist entry when the user didn't give one. */
export function defaultTitle(src: MediaSource): string {
  switch (src.kind) {
    case 'youtube': return src.id ? `YouTube · ${src.id}` : 'YouTube playlist';
    case 'spotify': return `Spotify · ${src.type}`;
    case 'soundcloud': return `SoundCloud · ${decodeURIComponent(src.url.split('/').filter(Boolean).slice(-1)[0] ?? '')}`;
    case 'audio': return decodeURIComponent(src.url.split('/').pop()?.split('?')[0] ?? 'Audio');
  }
}
