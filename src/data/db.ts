import Dexie, { type EntityTable } from 'dexie';
import type { BoardItem } from '../board/types';

export interface KV { key: string; value: unknown; updatedAt: number }
export interface StoredBlob { id: string; mime: string; data: Blob; createdAt: number }
/** `z` = position in the room's stacking order (IndexedDB returns rows sorted by id, not insertion). */
export type StoredItem = BoardItem & { roomId: string; z: number };

// Bump the version for every schema change and never edit old ones. Later: rooms, decks, cards, logs.
export const db = new Dexie('lernzimmer') as Dexie & {
  kv: EntityTable<KV, 'key'>;
  blobs: EntityTable<StoredBlob, 'id'>;
  items: EntityTable<StoredItem, 'id'>;
};

db.version(1).stores({
  kv: 'key',
  blobs: 'id, createdAt',
});

// v2 (M2): whiteboard items, one row per item, grouped by room
db.version(2).stores({
  items: 'id, roomId',
});
