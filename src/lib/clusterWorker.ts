import * as Comlink from 'comlink';
import type { RawTile } from '@/workers/clustering.worker';
import type { SocialCluster, ConvergenceEvent } from '@/types/field';
// Vite-friendly same-origin worker URL to avoid CSP/sandbox issues
import WorkerURL from '@/workers/clustering.worker?worker&url';

// Define the clustering API interface
export interface ClusteringAPI {
  cluster: (tiles: RawTile[], zoom?: number) => Promise<SocialCluster[]>;
  hitTest: (x: number, y: number, radius?: number) => Promise<string[]>;
  signals: (curr: SocialCluster[], zoom: number, now?: number) => Promise<{ convergences: ConvergenceEvent[] }>;
  reset: () => Promise<void>;
  // Phase 3 API extensions
  flowGrid: (clusters: SocialCluster[], zoom: number) => Promise<import('@/lib/field/types').FlowCell[]>;
  lanes: (clusters: SocialCluster[], zoom: number, now?: number) => Promise<import('@/lib/field/types').LaneSegment[]>;
  momentum: (clusters: SocialCluster[]) => Promise<import('@/lib/field/types').MomentumStat[]>;
  // Phase 3B API extensions (atmospheric)
  pressureGrid: (clusters: SocialCluster[], zoom: number) => Promise<import('@/lib/field/types').PressureCell[]>;
  stormGroups: (lanes: import('@/lib/field/types').LaneSegment[], zoom: number) => Promise<import('@/lib/field/types').StormGroup[]>;
}

/**
 * Fallback clustering implementation for when Web Workers aren't available
 */
class ClusteringFallback {
  private lastClusters: SocialCluster[] | null = null;
  
  async cluster(tiles: RawTile[], zoom = 11): Promise<SocialCluster[]> {
    const BASE_DIST = 32;
    const threshold = BASE_DIST * Math.pow(2, 11 - zoom);
    const clusters: SocialCluster[] = [];

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
        // For now, keep the existing vibe (tokens don't average)
        // TODO: Implement proper vibe blending logic
        hit.count = n;
      } else {
        clusters.push({
          id: `fallback_${t.id}`,
          x: t.x,
          y: t.y,
          r: t.r,
          count: 1,
          vibe: t.vibe,
          cohesionScore: 0.1
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
        hits.push(c.id); // Return cluster ID only, not tile provenance
      }
    });
    return hits;
  }

  async signals(curr: SocialCluster[], zoom: number, now = performance.now()): Promise<{ convergences: ConvergenceEvent[] }> {
    // Fallback implementation - no convergence prediction in fallback mode
    return { convergences: [] };
  }

  async flowGrid(clusters: SocialCluster[], zoom: number): Promise<import('@/lib/field/types').FlowCell[]> {
    // Fallback implementation - no flow vectors in fallback mode
    return [];
  }

  async lanes(clusters: SocialCluster[], zoom: number, now = performance.now()): Promise<import('@/lib/field/types').LaneSegment[]> {
    // Fallback implementation - no lanes in fallback mode
    return [];
  }

  async momentum(clusters: SocialCluster[]): Promise<import('@/lib/field/types').MomentumStat[]> {
    // Fallback implementation - no momentum in fallback mode
    return [];
  }

  async pressureGrid(clusters: SocialCluster[], zoom: number): Promise<import('@/lib/field/types').PressureCell[]> {
    // Fallback implementation - no pressure grid in fallback mode
    return [];
  }

  async stormGroups(lanes: import('@/lib/field/types').LaneSegment[], zoom: number): Promise<import('@/lib/field/types').StormGroup[]> {
    // Fallback implementation - no storm groups in fallback mode
    return [];
  }

  async reset(): Promise<void> {
    this.lastClusters = null;
  }
}

/**
 * Check if Web Workers are supported and safe to use
 */
const isWorkerSupported = (): boolean => {
  if (typeof Worker === 'undefined') return false;
  if (typeof window === 'undefined') return false;
  
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
let isWorkerFallbackInternal = false;

// HMR/singleton guard
const g = globalThis as any;
const KEY = '__clusterWorkerPromise';

function makeWorker(): Promise<Comlink.Remote<ClusteringAPI> | ClusteringAPI> {
  if (!isWorkerSupported()) {
    console.warn('[ClusterWorker] Workers unsupported → fallback');
    isWorkerFallbackInternal = true;
    return Promise.resolve(new ClusteringFallback());
  }
  try {
    const w = new Worker(WorkerURL, { type: 'module', name: 'clustering' });
    if (import.meta.hot) import.meta.hot.dispose(() => w.terminate());
    isWorkerFallbackInternal = false;
    return Promise.resolve(Comlink.wrap<ClusteringAPI>(w));
  } catch (e) {
    console.warn('[ClusterWorker] Worker instantiation failed → fallback', e);
    isWorkerFallbackInternal = true;
    return Promise.resolve(new ClusteringFallback());
  }
}

export async function getClusterWorker() {
  g[KEY] ||= makeWorker();
  return g[KEY] as Promise<Comlink.Remote<ClusteringAPI> | ClusteringAPI>;
}

export const isWorkerFallback = () => isWorkerFallbackInternal;

// Debug mode info
if (import.meta.env.DEV) {
  getClusterWorker().then(() => {
    console.info('[ClusterWorker] mode:', isWorkerFallback() ? 'fallback' : 'web-worker');
  });
}

// Legacy export for backwards compatibility
export const clusterWorker = {
  async cluster(tiles: RawTile[], zoom?: number) { return (await getClusterWorker()).cluster(tiles, zoom); },
  async hitTest(x: number, y: number, radius?: number) { return (await getClusterWorker()).hitTest(x, y, radius); },
  async signals(curr: SocialCluster[], zoom: number, now?: number) { return (await getClusterWorker()).signals(curr, zoom, now); },
  async reset() { return (await getClusterWorker()).reset(); },
  async flowGrid(clusters: SocialCluster[], zoom: number) { return (await getClusterWorker()).flowGrid(clusters, zoom); },
  async lanes(clusters: SocialCluster[], zoom: number, now?: number) { return (await getClusterWorker()).lanes(clusters, zoom, now); },
  async momentum(clusters: SocialCluster[]) { return (await getClusterWorker()).momentum(clusters); },
  async pressureGrid(clusters: SocialCluster[], zoom: number) { return (await getClusterWorker()).pressureGrid(clusters, zoom); },
  async stormGroups(lanes: import('@/lib/field/types').LaneSegment[], zoom: number) { return (await getClusterWorker()).stormGroups(lanes, zoom); },
};