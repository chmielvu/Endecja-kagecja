
import { KnowledgeGraph } from '../types';
import { buildGraphRAGIndex } from './ragService';

// --- Worker Management ---

class WorkerManager {
  private worker: Worker | null = null;
  private restartCount = 0;
  private maxRestarts = 3;
  private isTerminated = false;

  getWorker(): Worker {
    if (this.isTerminated) {
      throw new Error("Worker service has been terminated.");
    }

    if (!this.worker) {
      this.worker = new Worker(new URL('./graphWorker.ts', import.meta.url), { type: 'module' });
      this.worker.onerror = (e) => this.handleError(e);
      // Reset restart count on successful creation (could be debounced in a real app)
    }
    return this.worker;
  }

  private handleError(error: ErrorEvent) {
    console.error("Worker Error:", error);
    this.restartWorker();
  }

  public handleInternalError(msg: string) {
      console.warn("Worker reported internal error:", msg);
      this.restartWorker();
  }

  private restartWorker() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    if (this.restartCount < this.maxRestarts) {
      this.restartCount++;
      console.log(`Restarting GraphWorker (Attempt ${this.restartCount}/${this.maxRestarts})...`);
      // The next call to getWorker() will create a new one
    } else {
      console.error("GraphWorker exceeded maximum restart attempts. Features dependent on metrics may be unavailable.");
      // Optionally dispatch a global event or update store state here if coupled
    }
  }

  terminate() {
    this.isTerminated = true;
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Singleton instance
const workerManager = new WorkerManager();

export function getGraphWorker(): Worker {
  return workerManager.getWorker();
}

export function terminateWorker() {
  workerManager.terminate();
}

/**
 * Async version of metric enrichment using Web Worker with Supervisor Pattern
 */
export async function enrichGraphWithMetricsAsync(graph: KnowledgeGraph): Promise<KnowledgeGraph> {
  const w = getGraphWorker();
  
  return new Promise((resolve, reject) => {
    const handler = (e: MessageEvent) => {
      w.removeEventListener('message', handler);
      if (e.data.type === 'SUCCESS') {
        resolve(e.data.graph);
      } else if (e.data.type === 'ERROR') {
         // Notify manager to potentially restart
         workerManager.handleInternalError(e.data.message);
         reject(new Error(e.data.message));
      } else {
        reject(new Error("Unknown worker response"));
      }
    };
    
    // Safety timeout
    const timeout = setTimeout(() => {
        w.removeEventListener('message', handler);
        reject(new Error("Worker calculation timed out"));
    }, 15000);

    w.addEventListener('message', (e) => {
        clearTimeout(timeout);
        handler(e);
    });

    w.postMessage({ graph });
  });
}

// Re-export RAG function for Store consumer
export { buildGraphRAGIndex };

// Re-export Metrics for consumers (keep facade pattern)
export * from './metrics';
