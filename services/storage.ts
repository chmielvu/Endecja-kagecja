
import { openDB } from 'idb';
import { KnowledgeGraph } from '../types';

const DB_NAME = 'endecja-kg';
const STORE_NAME = 'graphs';

const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
};

export const storage = {
  async save(graph: KnowledgeGraph, version?: string) {
    const db = await initDB();
    await db.put(STORE_NAME, { 
      id: 'current', 
      graph, 
      version: version || graph.meta?.version || '1.0',
      savedAt: Date.now() 
    });
  },

  async load(): Promise<{ graph: KnowledgeGraph; version: string; savedAt: number } | null> {
    const db = await initDB();
    const record = await db.get(STORE_NAME, 'current');
    return record ? { graph: record.graph, version: record.version || '1.0', savedAt: record.savedAt } : null;
  }
};
