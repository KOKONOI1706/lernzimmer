import Dexie, { type EntityTable } from 'dexie';
import type { BoardItem } from '../board/types';
import type { Card, Deck, ReviewLog } from '../learn/cards';

export interface KV { key: string; value: unknown; updatedAt: number }
export interface StoredBlob { id: string; mime: string; data: Blob; createdAt: number }
/** `z` = position in the room's stacking order (IndexedDB returns rows sorted by id, not insertion). */
export type StoredItem = BoardItem & { roomId: string; z: number };

// Bump the version for every schema change and never edit old ones. Later: rooms.
export const db = new Dexie('lernzimmer') as Dexie & {
  kv: EntityTable<KV, 'key'>;
  blobs: EntityTable<StoredBlob, 'id'>;
  items: EntityTable<StoredItem, 'id'>;
  decks: EntityTable<Deck, 'id'>;
  cards: EntityTable<Card, 'id'>;
  logs: EntityTable<ReviewLog, 'id'>;
};

db.version(1).stores({
  kv: 'key',
  blobs: 'id, createdAt',
});

// v2 (M2): whiteboard items, one row per item, grouped by room
db.version(2).stores({
  items: 'id, roomId',
});

// v3 (M4): flashcards and review history
db.version(3).stores({
  decks: 'id',
  cards: 'id, deckId',
  logs: 'id, cardId, deckId, at',
});
