import { beforeEach, describe, expect, it } from 'vitest';
import { useBoard } from './store';
import { appendPoint, bbox, hitStroke, itemsUnder, stepZoom, zoomAt } from './geometry';
import type { StrokeItem } from './types';

const b = () => useBoard.getState();
const note = (x = 0, y = 0) => ({ kind: 'note' as const, x, y, w: 100, h: 100, text: '', color: '#ffe98a' });

beforeEach(() => useBoard.setState({ items: [], selected: [], past: [], future: [], editing: undefined }));

describe('board store history', () => {
  it('add is undoable and redoable', () => {
    b().add(note());
    expect(b().items).toHaveLength(1);
    b().undo();
    expect(b().items).toHaveLength(0);
    b().redo();
    expect(b().items).toHaveLength(1);
  });

  it('live updates after a checkpoint undo as one step', () => {
    const id = b().add(note());
    b().checkpoint();
    for (let x = 1; x <= 10; x++) b().update(id, { x });
    expect(b().items[0].x).toBe(10);
    b().undo();
    expect(b().items[0].x).toBe(0);
  });

  it('a new change clears the redo stack', () => {
    b().add(note());
    b().undo();
    b().add(note(5));
    b().redo();
    expect(b().items.map((i) => i.x)).toEqual([5]);
  });

  it('remove also unpins removed items and clears selection', () => {
    const n = b().add(note());
    const pin = b().add({ kind: 'pin', x: 50, y: 10, holds: [n] });
    b().select([n]);
    b().remove([n]);
    const p = b().items.find((i) => i.id === pin)!;
    expect(p.kind === 'pin' && p.holds).toEqual([]);
    expect(b().selected).toEqual([]);
  });

  it('toFront / toBack reorder z', () => {
    const a = b().add(note()); const c = b().add(note());
    b().toBack([c]);
    expect(b().items.map((i) => i.id)).toEqual([c, a]);
    b().toFront([c]);
    expect(b().items.map((i) => i.id)).toEqual([a, c]);
  });

  it('duplicate offsets copies and selects them', () => {
    const a = b().add(note(10, 10));
    b().duplicate([a]);
    expect(b().items).toHaveLength(2);
    expect(b().items[1]).toMatchObject({ x: 34, y: 34 });
    expect(b().selected).toEqual([b().items[1].id]);
  });
});

describe('geometry', () => {
  const stroke: StrokeItem = { id: 's', kind: 'stroke', x: 100, y: 100, points: [0, 0, 50, 0], size: 4, color: '#000', tool: 'pen' };

  it('hitStroke uses the stroke offset and thickness', () => {
    expect(hitStroke(stroke, { x: 125, y: 101 }, 1)).toBe(true);
    expect(hitStroke(stroke, { x: 125, y: 110 }, 1)).toBe(false);
    expect(hitStroke(stroke, { x: 125, y: 110 }, 8)).toBe(true);
  });

  it('bbox of a stroke includes its thickness', () => {
    expect(bbox(stroke)).toEqual({ x: 98, y: 98, w: 54, h: 4 });
  });

  it('bbox normalises negative shape sizes', () => {
    expect(bbox({ id: 'a', kind: 'shape', shape: 'arrow', x: 10, y: 10, w: -5, h: 20, stroke: '#000', size: 2 })).toEqual({ x: 5, y: 10, w: 5, h: 20 });
  });

  it('itemsUnder ignores strokes and pins', () => {
    useBoard.setState({ items: [] });
    const items = [
      { ...note(0, 0), id: 'n' },
      { ...stroke, id: 's', x: 0, y: 0 },
      { id: 'p', kind: 'pin' as const, x: 10, y: 10, holds: [] },
    ];
    expect(itemsUnder(items, { x: 10, y: 1 })).toEqual(['n']);
  });

  it('zoom steps and zoomAt keep the point under the cursor fixed', () => {
    expect(stepZoom(1, 1)).toBe(1.5);
    expect(stepZoom(1, -1)).toBe(0.75);
    expect(stepZoom(4, 1)).toBe(4);
    expect(stepZoom(1.2, -1)).toBe(1);
    const cam = zoomAt({ x: 0, y: 0, zoom: 1 }, 2, { x: 100, y: 50 });
    expect(cam).toEqual({ x: -100, y: -50, zoom: 2 });
  });

  it('appendPoint skips points that are too close', () => {
    expect(appendPoint([0, 0], 1, 0, 2)).toEqual([0, 0]);
    expect(appendPoint([0, 0], 3, 0, 2)).toEqual([0, 0, 3, 0]);
  });
});
