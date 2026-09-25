import Dexie, { type EntityTable } from 'dexie';

export interface KV { key: string; value: unknown; updatedAt: number }
export interface StoredBlob { id: string; mime: string; data: Blob; createdAt: number }

// Schema v1 (M1). Later milestones add rooms, items, decks, cards, logs. Bump the version and never edit old ones.
export const db = new Dexie('lernzimmer') as Dexie & {
  kv: EntityTable<KV, 'key'>;
  blobs: EntityTable<StoredBlob, 'id'>;
};

db.version(1).stores({
  kv: 'key',
  blobs: 'id, createdAt',
});
