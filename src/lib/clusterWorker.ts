import * as Comlink from 'comlink';
import type { RawTile, Cluster } from '@/workers/clustering.worker';

/**
 * Fallback clustering implementation for when Web Workers aren't available
 */
class ClusteringFallback {
  private lastClusters: Cluster[] | null = null;
  
  async cluster(tiles: RawTile[], zoom = 11): Promise<Cluster[]> {
    const BASE_DIST = 32;
    const threshold = BASE_DIST * Math.pow(2, 11 - zoom);
    const clusters: Cluster[] = [];

    tiles.forEach(t => {
      const hit = clusters.find(c => {
        const dx = c.x - t.x;
        const dy = c.y - t.y;
        return Math.hypot(dx, dy) < threshold;
      });

      if (hit) {
        const n = hit.count + 1;
        hit.x = (hit.x * hit.count + t.x) / n;
        hit.y = (hit.y * hit.count + t.y) / n;
        hit.r = Math.max(hit.r, t.r);
        hit.vibe = {
          h: (hit.vibe.h * hit.count + t.vibe.h) / n,
          s: (hit.vibe.s * hit.count + t.vibe.s) / n,
          l: (hit.vibe.l * hit.count + t.vibe.l) / n,
        };
        hit.count = n;
        hit.ids.push(t.id);
      } else {
        clusters.push({
          x: t.x,
          y: t.y,
          r: t.r,
          count: 1,
          vibe: { ...t.vibe },
          ids: [t.id],
        });
      }
    });

    this.lastClusters = clusters;
    return clusters;
  }

  async hitTest(x: number, y: number, radius = 20): Promise<string[]> {
    if (!this.lastClusters) return [];
    
    const hits: string[] = [];
    this.lastClusters.forEach(c => {
      const dx = c.x - x;
      const dy = c.y - y;
      if (Math.hypot(dx, dy) <= radius) {
        hits.push(...c.ids);
      }
    });
    return hits;
  }
}

/**
 * Check if Web Workers are supported and safe to use
 */
const isWorkerSupported = (): boolean => {
  if (typeof Worker === 'undefined') return false;
  if (typeof window === 'undefined') return false;
  
  // Disable workers in Lovable preview for better compatibility
  if (window.location.hostname.includes('lovable')) return false;
  
  // Check if we can actually create a worker
  try {
    const testWorker = new Worker(
      'data:text/javascript,self.postMessage(true)',
      { type: 'module' }
    );
    testWorker.terminate();
    return true;
  } catch {
    return false;
  }
};

/**
 * Singleton / HMR-safe worker wrapper with fallback support
 */
const createClusterWorker = () => {
  if (!isWorkerSupported()) {
    console.warn('[ClusterWorker] Web Workers not supported, using fallback implementation');
    return new ClusteringFallback();
  }

  const g = globalThis as any;
  const key = '__clusterWorker';

  if (g[key]) return Comlink.wrap(g[key] as Worker);

  try {
    const w = new Worker(
      new URL('../workers/clustering.worker.ts', import.meta.url),
      { type: 'module' },
    );

    if (import.meta.hot) {
      import.meta.hot.dispose(() => w.terminate());
    }

    g[key] = w;
    return Comlink.wrap<{
      cluster: (tiles: RawTile[], zoom?: number) => Promise<Cluster[]>;
      hitTest: (x: number, y: number, radius?: number) => Promise<string[]>;
    }>(w);
  } catch (error) {
    console.warn('[ClusterWorker] Failed to create worker, using fallback:', error);
    return new ClusteringFallback();
  }
};

export const clusterWorker = createClusterWorker();