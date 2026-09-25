import type { BoardItem, Camera, StrokeItem } from './types';

export interface Box { x: number; y: number; w: number; h: number }
export interface Pt { x: number; y: number }

/** Pin sprite (16×16 art) drawn at 3×; the needle tip is at art pixel (8, 13). */
export const PIN_SIZE = 48;
export const PIN_TIP = { x: 24, y: 40 } as const;

export const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4] as const;

/** Next zoom step in a direction (+1 in, -1 out). Works from any in-between zoom. */
export function stepZoom(zoom: number, dir: 1 | -1): number {
  if (dir > 0) return ZOOM_STEPS.find((z) => z > zoom + 1e-6) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
  return [...ZOOM_STEPS].reverse().find((z) => z < zoom - 1e-6) ?? ZOOM_STEPS[0];
}

/** Zoom keeping the world point under `screen` fixed. */
export function zoomAt(cam: Camera, zoom: number, screen: Pt): Camera {
  const wx = (screen.x - cam.x) / cam.zoom;
  const wy = (screen.y - cam.y) / cam.zoom;
  return { zoom, x: Math.round(screen.x - wx * zoom), y: Math.round(screen.y - wy * zoom) };
}

export const snap = (v: number, grid: number) => Math.round(v / grid) * grid;

/** Rough text metrics for VT323 (≈0.5em per glyph). Good enough for hit boxes and pins. */
export function textBox(text: string, size: number): { w: number; h: number } {
  const lines = text.split('\n');
  return { w: Math.max(size, ...lines.map((l) => l.length * size * 0.5)), h: lines.length * size };
}

export function bbox(item: BoardItem): Box {
  switch (item.kind) {
    case 'stroke': {
      const xs = item.points.filter((_, i) => i % 2 === 0);
      const ys = item.points.filter((_, i) => i % 2 === 1);
      const pad = item.size / 2;
      const minX = Math.min(...xs), minY = Math.min(...ys);
      return { x: item.x + minX - pad, y: item.y + minY - pad, w: Math.max(...xs) - minX + item.size, h: Math.max(...ys) - minY + item.size };
    }
    case 'shape':
      return { x: Math.min(item.x, item.x + item.w), y: Math.min(item.y, item.y + item.h), w: Math.abs(item.w), h: Math.abs(item.h) };
    case 'text': {
      const m = textBox(item.text, item.size);
      return { x: item.x, y: item.y, w: item.w ?? m.w, h: m.h };
    }
    case 'pin':
      return { x: item.x - PIN_TIP.x, y: item.y - PIN_TIP.y, w: PIN_SIZE, h: PIN_SIZE };
    default:
      return { x: item.x, y: item.y, w: item.w, h: item.h };
  }
}

export const inBox = (p: Pt, b: Box) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

/** Distance from p to segment ab. */
function segDist(p: Pt, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / len2)) : 0;
  return Math.hypot(p.x - (ax + t * dx), p.y - (ay + t * dy));
}

/** Does a circle of radius r at p touch the stroke? */
export function hitStroke(s: StrokeItem, p: Pt, r: number): boolean {
  const local = { x: p.x - s.x, y: p.y - s.y };
  const reach = r + s.size / 2;
  const pts = s.points;
  if (pts.length === 2) return Math.hypot(local.x - pts[0], local.y - pts[1]) <= reach;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    if (segDist(local, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]) <= reach) return true;
  }
  return false;
}

/** Items a pin at p should hold: topmost-first, anything but strokes and other pins. */
export function itemsUnder(items: BoardItem[], p: Pt): string[] {
  return items.filter((it) => it.kind !== 'pin' && it.kind !== 'stroke' && inBox(p, bbox(it))).map((it) => it.id);
}

/** Drop near-duplicate points while drawing (keeps strokes light). */
export function appendPoint(points: number[], x: number, y: number, minDist: number): number[] {
  const n = points.length;
  if (n >= 2 && Math.hypot(x - points[n - 2], y - points[n - 1]) < minDist) return points;
  return [...points, x, y];
}
