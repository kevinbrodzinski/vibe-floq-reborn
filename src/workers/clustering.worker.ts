 
import * as Comlink from 'comlink';

/* ────────────── types ────────────── */
export interface RawTile {
  id:   string;                       // tile_id (kept for provenance / hit-test)
  x:    number;                       // screen-space px  (projectToScreen)
  y:    number;
  r:    number;                       // radius  (crowdCountToRadius)
  vibe: { h: number; s: number; l: number };
}

export interface Cluster {
  x: number;
  y: number;
  r: number;
  count: number;                      // how many tiles merged
  vibe: { h: number; s: number; l: number };
  ids: string[];                      // merged tile_ids  (hit-test)
  // Phase 1: Social physics
  velocity?: { vx: number; vy: number };
  cohesionScore?: number;
  breathingPhase?: number;
  momentum?: number;
}

/* ────────────── helpers ────────────── */
const BASE_DIST = 32;                 // px at zoom 11
const mergeDistanceForZoom = (zoom: number) =>
  BASE_DIST * Math.pow(2, 11 - zoom); // shrinks as we zoom in

let lastClusters: Cluster[] | null = null;

/* ────────────── API ────────────── */
const api = {
  /** spatial merge with social physics – keeps provenance (ids) for hit-testing */
  cluster(tiles: RawTile[], zoom = 11): Cluster[] {
    const threshold = mergeDistanceForZoom(zoom);
    const clusters: Cluster[] = [];
    const currentTime = Date.now();

    try {
      tiles.forEach(t => {
        const hit = clusters.find(c => {
          const dx = c.x - t.x;
          const dy = c.y - t.y;
          return Math.hypot(dx, dy) < threshold;
        });

        if (hit) {
          /* running-average merge */
          const n   = hit.count + 1;
          const prevX = hit.x;
          const prevY = hit.y;
          
          hit.x     = (hit.x * hit.count + t.x) / n;
          hit.y     = (hit.y * hit.count + t.y) / n;
          hit.r     = Math.max(hit.r, t.r);
          hit.vibe  = {
            h: (hit.vibe.h * hit.count + t.vibe.h) / n,
            s: (hit.vibe.s * hit.count + t.vibe.s) / n,
            l: (hit.vibe.l * hit.count + t.vibe.l) / n,
          };
          hit.count = n;
          hit.ids.push(t.id);

          // Phase 1: Compute basic velocity from center shift
          hit.velocity = {
            vx: (hit.x - prevX) * 0.1, // Smooth velocity
            vy: (hit.y - prevY) * 0.1
          };

          // Phase 1: Cohesion score based on density
          hit.cohesionScore = Math.min(hit.count / 10, 1.0);

          // Phase 1: Breathing phase for animation
          hit.breathingPhase = (currentTime / 3000) % (Math.PI * 2);

          // Phase 1: Momentum based on count and velocity
          const speed = Math.hypot(hit.velocity.vx, hit.velocity.vy);
          hit.momentum = hit.count * speed;

        } else {
          const newCluster: Cluster = { 
            x: t.x, 
            y: t.y, 
            r: t.r, 
            count: 1, 
            vibe: t.vibe, 
            ids: [t.id],
            // Phase 1: Initialize physics
            velocity: { vx: 0, vy: 0 },
            cohesionScore: 0.1, // Low for single particles
            breathingPhase: (currentTime / 3000) % (Math.PI * 2),
            momentum: 0.1
          };
          clusters.push(newCluster);
        }
      });
    } catch (err) {
       
      console.error('[cluster-worker]', err);
    }

    lastClusters = clusters;
    return clusters;
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