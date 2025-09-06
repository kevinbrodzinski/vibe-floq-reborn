import * as Comlink from 'comlink';
import type { SocialCluster, VibeToken } from '@/types/field';
import { stableClusterId } from '@/lib/field/clusterId';

/* ────────────── types ────────────── */
export interface RawTile {
  id: string;                       // tile_id (kept for provenance / hit-test)
  x: number;                        // screen-space px  (projectToScreen)
  y: number;
  r: number;                        // radius  (crowdCountToRadius)
  vibe: VibeToken;                  // design token, not raw HSL
}

/* ────────────── helpers ────────────── */
const BASE_DIST = 32;                 // px at zoom 11
const mergeDistanceForZoom = (zoom: number) =>
  BASE_DIST * Math.pow(2, 11 - zoom); // shrinks as we zoom in

let lastClusters: SocialCluster[] | null = null;

/* ────────────── API ────────────── */
const api = {
  /** 
   * Spatial merge with stable IDs and cohesion - NO velocity computation here
   * Velocity will be computed cross-frame on client
   */
  cluster(tiles: RawTile[], zoom = 11): SocialCluster[] {
    const threshold = mergeDistanceForZoom(zoom);
    const clusters: Array<Omit<SocialCluster, 'id' | 'ids'> & { _ids: string[] }> = [];

    try {
      tiles.forEach(t => {
        const hit = clusters.find(c => {
          const dx = c.x - t.x;
          const dy = c.y - t.y;
          return Math.hypot(dx, dy) < threshold;
        });

        if (hit) {
          // Running-average merge
          const n = hit.count + 1;
          hit.x = (hit.x * hit.count + t.x) / n;
          hit.y = (hit.y * hit.count + t.y) / n;
          hit.r = Math.max(hit.r, t.r);
          hit.count = n;
          hit._ids.push(t.id);
          
          // Lightweight cohesion proxy based on density
          hit.cohesionScore = Math.min(n / 10, 1.0);
        } else {
          clusters.push({ 
            x: t.x, 
            y: t.y, 
            r: t.r, 
            count: 1, 
            vibe: t.vibe, 
            cohesionScore: 0.1, // Low for single particles
            _ids: [t.id]
          });
        }
      });
    } catch (err) {
      console.error('[cluster-worker]', err);
    }

    // Convert to final format with stable IDs
    const finalClusters: SocialCluster[] = clusters.map(c => ({
      id: stableClusterId(c._ids),
      x: c.x,
      y: c.y,
      r: c.r,
      count: c.count,
      vibe: c.vibe,
      cohesionScore: c.cohesionScore,
      ids: c._ids
    }));

    lastClusters = finalClusters;
    return finalClusters;
  },

  /** cursor hit-test → returns tile_ids within `radius` px */
  hitTest(x: number, y: number, radius = 12): string[] {
    if (!lastClusters) return [];
    const r2 = radius * radius;
    return lastClusters
      .filter(c => {
        const dx = c.x - x;
        const dy = c.y - y;
        return dx * dx + dy * dy <= r2;
      })
      .flatMap(c => c.ids);
  },
};

Comlink.expose(api);