import { useEffect, useState } from 'react';
import { db } from '../data/db';
import type { Background } from './settings';

export const presetUrl = (ref: string) => `/assets/backgrounds/${ref}.png`;

/** Resolves a Background to an <img> src (object URL for uploaded blobs). */
export function useBackgroundUrl(bg: Background): string | undefined {
  const [blobUrl, setBlobUrl] = useState<string>();
  const blobId = bg.kind === 'blob' ? bg.ref : undefined;

  useEffect(() => {
    if (!blobId) return;
    let url: string | undefined;
    let cancelled = false;
    void db.blobs.get(blobId).then((b) => {
      if (cancelled || !b) return;
      url = URL.createObjectURL(b.data);
      setBlobUrl(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setBlobUrl(undefined);
    };
  }, [blobId]);

  if (bg.kind === 'preset') return presetUrl(bg.ref);
  if (bg.kind === 'blob') return blobUrl;
  return undefined;
}
