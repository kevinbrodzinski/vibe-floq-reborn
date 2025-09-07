import * as Comlink from 'comlink';
import type { RawTile } from '@/workers/clustering.worker';
import type { SocialCluster, ConvergenceEvent } from '@/types/field';

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
const createClusterWorker = (): ClusteringAPI => {
  if (!isWorkerSupported()) {
    console.warn('[ClusterWorker] Web Workers not supported, using fallback implementation');
    return new ClusteringFallback();
  }

  const g = globalThis as any;
  const key = '__clusterWorker';

  if (g[key]) return Comlink.wrap<ClusteringAPI>(g[key] as Worker);

  try {
    const w = new Worker(
      new URL('../workers/clustering.worker.ts', import.meta.url),
      { type: 'module' },
    );

    if (import.meta.hot) {
      import.meta.hot.dispose(() => w.terminate());
    }

    g[key] = w;
    return Comlink.wrap<ClusteringAPI>(w);
  } catch (error) {
    console.warn('[ClusterWorker] Failed to create worker, using fallback:', error);
    return new ClusteringFallback();
  }
};

export const clusterWorker = createClusterWorker();