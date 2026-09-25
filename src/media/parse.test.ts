import { describe, expect, it } from 'vitest';
import { defaultTitle, parseMediaUrl } from './parse';

describe('parseMediaUrl', () => {
  it('YouTube watch, short link, shorts and music', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      'https://youtu.be/jfKfPfyJRdk?si=abc',
      'https://youtube.com/shorts/jfKfPfyJRdk',
      'https://music.youtube.com/watch?v=jfKfPfyJRdk&feature=share',
    ]) {
      const r = parseMediaUrl(url);
      expect(r).toMatchObject({ kind: 'youtube', id: 'jfKfPfyJRdk' });
      expect(r?.kind === 'youtube' && r.embed).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/jfKfPfyJRdk\?/);
    }
  });

  it('YouTube playlist without a video uses videoseries', () => {
    const r = parseMediaUrl('https://www.youtube.com/playlist?list=PL6NdkXsPL07KN01gH2vucrHCEyyNmVEx4');
    expect(r?.kind === 'youtube' && r.embed).toContain('/embed/videoseries?');
    expect(r?.kind === 'youtube' && r.embed).toContain('list=PL6NdkXsPL07KN01gH2vucrHCEyyNmVEx4');
  });

  it('Spotify with or without intl prefix', () => {
    expect(parseMediaUrl('https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn?si=x')).toEqual({
      kind: 'spotify', type: 'playlist', id: '37i9dQZF1DWWQRwui0ExPn', embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn',
    });
    expect(parseMediaUrl('https://open.spotify.com/intl-de/track/4uLU6hMCjMI75M1A2tKUQC')).toMatchObject({ type: 'track' });
  });

  it('SoundCloud goes through the widget with the url encoded', () => {
    const r = parseMediaUrl('https://soundcloud.com/lofi-girl/sets/sleepy?utm=1');
    expect(r?.kind).toBe('soundcloud');
    expect(r?.kind === 'soundcloud' && r.embed).toContain(encodeURIComponent('https://soundcloud.com/lofi-girl/sets/sleepy'));
    expect(r?.kind === 'soundcloud' && r.url).not.toContain('utm');
  });

  it('direct audio files', () => {
    expect(parseMediaUrl('https://example.com/music/Regen%20im%20Wald.mp3')).toEqual({ kind: 'audio', url: 'https://example.com/music/Regen%20im%20Wald.mp3' });
    expect(defaultTitle({ kind: 'audio', url: 'https://example.com/music/Regen%20im%20Wald.mp3' })).toBe('Regen im Wald.mp3');
  });

  it('rejects everything else', () => {
    for (const bad of ['', 'not a url', 'javascript:alert(1)', 'https://example.com/page', 'https://youtube.com/watch?v=short', 'https://open.spotify.com/user/abc', 'file:///C:/x.mp3']) {
      expect(parseMediaUrl(bad)).toBeNull();
    }
  });
});
