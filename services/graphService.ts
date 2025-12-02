
import { KnowledgeGraph } from '../types';
import { buildGraphRAGIndex } from './ragService';

// --- Worker Management ---
let worker: Worker | null = null;

export function getGraphWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./graphWorker.ts', import.meta.url), { type: 'module' });
  }
  return worker;
}

export function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

/**
 * Async version of metric enrichment using Web Worker
 */
export async function enrichGraphWithMetricsAsync(graph: KnowledgeGraph): Promise<KnowledgeGraph> {
  const w = getGraphWorker();
  
  return new Promise((resolve, reject) => {
    const handler = (e: MessageEvent) => {
      w.removeEventListener('message', handler);
      if (e.data.type === 'SUCCESS') {
        resolve(e.data.graph);
      } else {
        reject(new Error(e.data.message));
      }
    };
    
    w.addEventListener('message', handler);
    w.postMessage({ graph });
  });
}

// Re-export RAG function for Store consumer
export { buildGraphRAGIndex };

// Re-export Metrics for consumers (keep facade pattern)
export * from './metrics';
