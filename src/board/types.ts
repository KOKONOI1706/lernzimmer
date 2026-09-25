// Board data model (docs/DESIGN.md §5.3). Positions are world coordinates; array order = z-order.

export type Tool =
  | 'select' | 'hand' | 'pen' | 'highlighter' | 'eraser'
  | 'rect' | 'ellipse' | 'arrow' | 'text' | 'note' | 'pin' | 'sticker';

interface Base {
  id: string;
  x: number;
  y: number;
  rot?: number;
}

export interface StrokeItem extends Base { kind: 'stroke'; points: number[]; color: string; size: number; tool: 'pen' | 'highlighter'; pixel?: boolean }
/** rect/ellipse: box at (x,y,w,h). arrow: from (x,y) to (x+w, y+h) — w/h may be negative. */
export interface ShapeItem extends Base { kind: 'shape'; shape: 'rect' | 'ellipse' | 'arrow'; w: number; h: number; stroke: string; fill?: string; size: number }
export interface TextItem extends Base { kind: 'text'; text: string; size: number; color: string; w?: number }
export interface NoteItem extends Base { kind: 'note'; text: string; color: string; w: number; h: number }
export interface StickerItem extends Base {
  kind: 'sticker';
  /** uploaded image in db.blobs, or a built-in sprite name */
  blobId?: string;
  sprite?: string;
  w: number;
  h: number;
  outline: boolean;
  /** block size for the pixelate effect, 0 = off */
  pixelate: number;
}
/** A pin moves the items it was stuck onto. */
export interface PinItem extends Base { kind: 'pin'; holds: string[] }

export type BoardItem = StrokeItem | ShapeItem | TextItem | NoteItem | StickerItem | PinItem;
export type ItemKind = BoardItem['kind'];

export interface Camera { x: number; y: number; zoom: number }

export const NOTE_COLORS = ['#ffe98a', '#ffc4dd', '#bfe3ff', '#c8f5c8', '#d9c8ff', '#fffaf0'] as const;

/** Pen palette: gender colours first (der / die / das / plural), then basics. */
export const INK_COLORS = ['#1f4fd1', '#e0344a', '#3fbf6a', '#ffd23f', '#0d0b1e', '#f4efe6', '#ff9ecb', '#ff8a2a', '#8b5cf6', '#3fd0ff'] as const;

export const SIZES = { pen: [2, 4, 8, 16], text: [24, 36, 56, 80] } as const;
