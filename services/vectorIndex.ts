
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { KnowledgeGraph } from '../types';
import { getEmbeddingsBatch, cosineSimilarity } from './embeddingService';

interface VectorDB extends DBSchema {
  embeddings: {
    key: string;
    value: {
      id: string;
      vector: number[];
      text: string;
      timestamp: number;
    };
  };
}

const DB_NAME = 'endecja-vector-index';
const STORE_NAME = 'embeddings';

class VectorIndexService {
  private dbPromise: Promise<IDBPDatabase<VectorDB>>;

  constructor() {
    this.dbPromise = openDB<VectorDB>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      },
    });
  }

  async buildIndex(graph: KnowledgeGraph, onProgress?: (percent: number) => void) {
    const db = await this.dbPromise;
    const nodes = graph.nodes;
    const total = nodes.length;
    
    // 1. Identify stale/missing nodes
    const nodesToEmbed = [];
    for (let i = 0; i < total; i++) {
      const node = nodes[i];
      const cached = await db.get(STORE_NAME, node.data.id);
      const text = `${node.data.label}: ${node.data.description || ''}`;
      
      // Re-embed if text changed or missing
      if (!cached || cached.text !== text) {
        nodesToEmbed.push({ node, text });
      }
    }

    if (nodesToEmbed.length === 0) {
      if (onProgress) onProgress(100);
      return;
    }

    // 2. Batch process embeddings
    const BATCH_SIZE = 10;
    for (let i = 0; i < nodesToEmbed.length; i += BATCH_SIZE) {
      const batch = nodesToEmbed.slice(i, i + BATCH_SIZE);
      const texts = batch.map(b => b.text);
      
      try {
        const embeddings = await getEmbeddingsBatch(texts);
        const tx = db.transaction(STORE_NAME, 'readwrite');
        
        await Promise.all(batch.map((item, idx) => {
          if (embeddings[idx] && embeddings[idx].length > 0) {
             return tx.store.put({
                id: item.node.data.id,
                vector: embeddings[idx],
                text: item.text,
                timestamp: Date.now()
             });
          }
          return Promise.resolve();
        }));
        
        await tx.done;
        
        if (onProgress) {
          const processed = i + batch.length;
          onProgress(Math.min(100, (processed / nodesToEmbed.length) * 100));
        }
      } catch (e) {
        console.error("Batch embedding failed", e);
      }
    }
  }

  async search(queryVector: number[], limit: number = 20): Promise<Array<{ id: string; score: number }>> {
    const db = await this.dbPromise;
    const allRecords = await db.getAll(STORE_NAME);
    
    const results = allRecords.map(record => ({
      id: record.id,
      score: cosineSimilarity(queryVector, record.vector)
    }));

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

export const vectorIndex = new VectorIndexService();
