import { db } from '../data/db';
import { spriteUrl } from '../ui/Sprite';
import atlas from '../../public/assets/sprites/atlas.json';
import type { StickerItem } from './types';

/** Sprites offered in the sticker picker. */
export const STICKER_SPRITES = [
  'pretzel', 'dachshund', 'flag_de', 'flag_vn', 'non_la', 'xe_may', 'heart', 'mug',
  'book', 'coin', 'clock', 'fire', 'tree', 'raindrop', 'sparkle', 'music_note',
] as const;

/** Default display size of a built-in sprite sticker, in multiples of its art size. */
export const SPRITE_SCALE = 4;
const OUTLINE = 6;

const firstFrame = (sprite: string) => (atlas.sprites as Record<string, { frames: string[] }>)[sprite]?.frames[0] ?? sprite;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const sources = new Map<string, Promise<HTMLImageElement>>();
function source(item: Pick<StickerItem, 'blobId' | 'sprite'>): Promise<HTMLImageElement> {
  const key = item.blobId ? `blob:${item.blobId}` : `sprite:${item.sprite}`;
  let p = sources.get(key);
  if (!p) {
    p = item.blobId
      ? db.blobs.get(item.blobId).then((b) => {
          if (!b) throw new Error(`sticker blob ${item.blobId} missing`);
          return loadImage(URL.createObjectURL(b.data));
        })
      : loadImage(spriteUrl(firstFrame(item.sprite!)));
    p.catch(() => sources.delete(key));
    sources.set(key, p);
  }
  return p;
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/**
 * Render a sticker into a canvas at source resolution: photos can be pixelated, and an optional
 * white die-cut outline is added around the alpha shape. Scaling happens at draw time (see `smoothFor`).
 */
function render(img: HTMLImageElement, sprite: boolean, pixelate: number, outline: boolean): HTMLCanvasElement {
  // 1. base image (sprites: crisp upscale; photos: optional pixelation)
  let base: HTMLCanvasElement;
  if (!sprite && pixelate > 0) {
    const small = canvas(img.naturalWidth / pixelate, img.naturalHeight / pixelate);
    small.getContext('2d')!.drawImage(img, 0, 0, small.width, small.height);
    base = canvas(img.naturalWidth, img.naturalHeight);
    const ctx = base.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, base.width, base.height);
  } else {
    base = canvas(img.naturalWidth, img.naturalHeight);
    base.getContext('2d')!.drawImage(img, 0, 0);
  }
  if (!outline) return base;

  // 2. die-cut outline: stamp a white silhouette in a ring, then the image on top
  // sprites: 1 art pixel; photos: proportional to size
  const r = sprite ? 1 : Math.max(OUTLINE, Math.round(Math.max(base.width, base.height) / 60));
  const silhouette = canvas(base.width, base.height);
  const sctx = silhouette.getContext('2d')!;
  sctx.drawImage(base, 0, 0);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = '#ffffff';
  sctx.fillRect(0, 0, silhouette.width, silhouette.height);

  const out = canvas(base.width + r * 2, base.height + r * 2);
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const steps = sprite ? 8 : 16;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ctx.drawImage(silhouette, r + Math.round(Math.cos(a) * r), r + Math.round(Math.sin(a) * r));
  }
  ctx.drawImage(base, r, r);
  return out;
}

const rendered = new Map<string, Promise<HTMLCanvasElement>>();
export function stickerCanvas(item: Pick<StickerItem, 'blobId' | 'sprite' | 'pixelate' | 'outline'>): Promise<HTMLCanvasElement> {
  const key = `${item.blobId ?? item.sprite}|${item.pixelate}|${item.outline}`;
  let p = rendered.get(key);
  if (!p) {
    p = source(item).then((img) => render(img, !!item.sprite, item.pixelate, item.outline));
    p.catch(() => rendered.delete(key));
    rendered.set(key, p);
  }
  return p;
}

/** Natural display size for a new sticker (fits within `max`). */
export async function stickerSize(item: Pick<StickerItem, 'blobId' | 'sprite' | 'pixelate' | 'outline'>, max = 240) {
  const c = await stickerCanvas(item);
  const k = item.sprite ? SPRITE_SCALE : Math.min(1, max / Math.max(c.width, c.height));
  return { w: Math.round(c.width * k), h: Math.round(c.height * k) };
}

/** Pixel art (sprites, pixelated photos) is drawn with nearest-neighbour so it stays crisp when scaled. */
export const smoothFor = (item: Pick<StickerItem, 'sprite' | 'pixelate'>) => !item.sprite && !item.pixelate;
