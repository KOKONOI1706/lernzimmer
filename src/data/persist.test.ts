import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { hydrate, saveNow } from './persist';
import { useBoard } from '../board/store';

const note = (id: string) => ({ id, kind: 'note' as const, x: 0, y: 0, w: 100, h: 100, text: id, color: '#ffe98a' });

beforeEach(async () => {
  await db.items.clear();
  await db.kv.clear();
  await db.blobs.clear();
  useBoard.setState({ items: [], camera: { x: 0, y: 0, zoom: 1 }, toolbar: true, past: [], future: [] });
});

describe('board persistence', () => {
  it('keeps stacking order across save/load even when ids sort differently', async () => {
    // ids chosen so that id order (a, m, z) differs from z-order (z, a, m)
    useBoard.setState({ items: [note('z'), note('a'), note('m')] });
    await saveNow();
    useBoard.setState({ items: [] });
    await hydrate();
    expect(useBoard.getState().items.map((i) => i.id)).toEqual(['z', 'a', 'm']);
    expect(useBoard.getState().items[0]).not.toHaveProperty('roomId');
    expect(useBoard.getState().items[0]).not.toHaveProperty('z');
  });

  it('restores camera and toolbar prefs, and removed items stay removed', async () => {
    useBoard.setState({ items: [note('a'), note('b')], camera: { x: 12, y: -30, zoom: 2 }, toolbar: false });
    await saveNow();
    useBoard.setState({ items: [note('a')] });
    await saveNow();
    useBoard.setState({ items: [], camera: { x: 0, y: 0, zoom: 1 }, toolbar: true });
    await hydrate();
    const s = useBoard.getState();
    expect(s.items.map((i) => i.id)).toEqual(['a']);
    expect(s.camera).toEqual({ x: 12, y: -30, zoom: 2 });
    expect(s.toolbar).toBe(false);
  });

  it('garbage-collects sticker images nothing references', async () => {
    await db.blobs.bulkPut([
      { id: 'used', mime: 'image/png', data: new Blob(), createdAt: 0 },
      { id: 'orphan', mime: 'image/png', data: new Blob(), createdAt: 0 },
    ]);
    useBoard.setState({ items: [{ id: 's', kind: 'sticker', x: 0, y: 0, w: 10, h: 10, blobId: 'used', outline: false, pixelate: 0 }] });
    await saveNow();
    await hydrate();
    expect((await db.blobs.toCollection().primaryKeys()).sort()).toEqual(['used']);
  });
});
