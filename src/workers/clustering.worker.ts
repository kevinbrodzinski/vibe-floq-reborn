import * as Comlink from 'comlink';
import type { SocialCluster, VibeToken } from '@/types/field';
import { stableClusterId } from '@/lib/field/clusterId';
import { CLUSTER } from '@/lib/field/constants';

/* ────────────── types ────────────── */
export interface RawTile {
  id: string;                       // tile_id (kept for provenance / hit-test)
  x: number;                        // screen-space px  (projectToScreen)
  y: number;
  r: number;                        // radius  (crowdCountToRadius)
  vibe: VibeToken;                  // design token, not raw HSL
}

/* ────────────── helpers ────────────── */
const mergeDistanceForZoom = (zoom: number) =>
  CLUSTER.BASE_MERGE_DISTANCE * Math.pow(2, 11 - zoom); // shrinks as we zoom in

let lastClusters: SocialCluster[] | null = null;

/* ────────────── API ────────────── */
const api = {
  /** 
   * Spatial merge with stable IDs and cohesion - NO velocity computation here
   * Velocity will be computed cross-frame on client
   */
  cluster(tiles: RawTile[], zoom = 11): SocialCluster[] {
    const threshold = mergeDistanceForZoom(zoom);
    const work: Array<{x:number;y:number;r:number;count:number;vibe:VibeToken;_ids:string[];cohesionScore:number}> = [];

    try {
      for (const t of tiles) {
        const hit = work.find(c => {
          const dx = c.x - t.x, dy = c.y - t.y;
          return (dx*dx + dy*dy) < (threshold*threshold);
        });
        
        if (hit) {
          const n = hit.count + 1;
          hit.x = (hit.x * hit.count + t.x) / n;
          hit.y = (hit.y * hit.count + t.y) / n;
          hit.r = Math.max(hit.r, t.r);
          hit.count = n;
          hit._ids.push(t.id);
          hit.cohesionScore = Math.min(n / 10, 1);
        } else {
          work.push({ x:t.x, y:t.y, r:t.r, count:1, vibe:t.vibe, _ids:[t.id], cohesionScore:0.1 });
        }
      }
    } catch (err) {
      console.error('[cluster-worker]', err);
    }

    // Convert to final format with stable IDs (no _ids exposed for privacy)
    const finalClusters: SocialCluster[] = work.map(c => ({
      id: stableClusterId(c._ids),
      x: c.x, y: c.y, r: c.r, count: c.count, vibe: c.vibe,
      cohesionScore: c.cohesionScore
      // No ids field - keep provenance private
    }));

    lastClusters = finalClusters;
    return finalClusters;
  },

  /** cursor hit-test → returns cluster_ids within `radius` px (dev only) */
  hitTest(x: number, y: number, radius = 12): string[] {
    if (!lastClusters) return [];
    const r2 = radius * radius;
    return lastClusters
      .filter(c => {
        const dx = c.x - x;
        const dy = c.y - y;
        return dx * dx + dy * dy <= r2;
      })
      .map(c => c.id); // Return cluster IDs only, not tile provenance
  },
};

Comlink.expose(api);