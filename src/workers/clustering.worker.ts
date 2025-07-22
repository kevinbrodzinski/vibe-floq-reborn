/* eslint-disable no-restricted-globals */
import * as Comlink from 'comlink';

export interface RawTile {
  id:   string;                               // tile_id  (needed for hit-test)
  x:    number;                               // projected px
  y:    number;
  r:    number;                               // radius px
  vibe: { h: number; s: number; l: number };
}

export interface Cluster {
  x: number;
  y: number;
  r: number;
  count: number;
  vibe: { h: number; s: number; l: number };
  ids: string[];                             // all source tile_ids in this cluster
}

/* ------------------------------------------------------------------ */

let lastClusters: Cluster[] | null = null;

const mergeDistanceForZoom = (zoom: number) => {
  const base = 32;                            // px at z11
  return base * Math.pow(2, 11 - zoom);       // shrink at higher zooms
};

const api = {
  /** spatial merge — returns clusters & keeps a copy for hit-test */
  cluster (tiles: RawTile[], zoom = 11): Cluster[] {
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
          /* running average merge */
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
          hit.ids.push(t.id);                 // keep provenance
        } else {
          clusters.push({
            x: t.x, y: t.y, r: t.r,
            count: 1,
            vibe: t.vibe,
            ids: [t.id],
          });
        }
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[cluster-worker]', err);
    }

    lastClusters = clusters;
    return clusters;
  },

  /** cursor-hit → return *tile_ids* inside radius (px) */
  hitTest (x: number, y: number, radius = 12): string[] {
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