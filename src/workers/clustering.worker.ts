 
import * as Comlink from 'comlink';

/* ────────────── types ────────────── */
export interface RawTile {
  id:   string;                       // tile_id (kept for provenance / hit-test)
  x:    number;                       // screen-space px  (projectLatLng)
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
}

/* ────────────── helpers ────────────── */
const BASE_DIST = 32;                 // px at zoom 11
const mergeDistanceForZoom = (zoom: number) =>
  BASE_DIST * Math.pow(2, 11 - zoom); // shrinks as we zoom in

let lastClusters: Cluster[] | null = null;

/* ────────────── API ────────────── */
const api = {
  /** spatial merge – keeps provenance (ids) for hit-testing */
  cluster(tiles: RawTile[], zoom = 11): Cluster[] {
    const threshold = mergeDistanceForZoom(zoom);
    const clusters: Cluster[] = [];

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
        } else {
          clusters.push({ x: t.x, y: t.y, r: t.r, count: 1, vibe: t.vibe, ids: [t.id] });
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