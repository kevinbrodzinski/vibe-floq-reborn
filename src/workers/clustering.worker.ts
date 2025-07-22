/* eslint-disable no-restricted-globals */
import * as Comlink from 'comlink';

export interface RawTile {
  x: number;           // pixel-space (already projected)
  y: number;
  r: number;           // radius from crowdCountToRadius
  vibe: { h: number; s: number; l: number };
}

export interface Cluster {
  x: number;
  y: number;
  r: number;           // merged radius
  count: number;       // how many tiles merged
  vibe: { h: number; s: number; l: number };
}

/** px threshold at zoom 11; we scale inversely with zoom so
 *  clusters feel ~constant on screen. */
const BASE_DIST = 32;

const api = {
  cluster(tiles: RawTile[], zoom = 11): Cluster[] {
    try {
      const threshold = BASE_DIST * (11 / zoom);  // zoom-aware
      const clusters: Cluster[] = [];

      tiles.forEach(t => {
        const hit = clusters.find(c => {
          const dx = c.x - t.x;
          const dy = c.y - t.y;
          return Math.hypot(dx, dy) < threshold;
        });

        if (hit) {
          // merge into existing cluster (simple running average)
          const n = hit.count + 1;
          hit.x = (hit.x * hit.count + t.x) / n;
          hit.y = (hit.y * hit.count + t.y) / n;
          hit.r = Math.max(hit.r, t.r);
        /* weight L by crowd radius so bigger blobs look brighter */
        const crowdWeight = Math.max(t.r, 1);
        const weightedOldL = hit.vibe.l * hit.count;
        const weightedNewL = t.vibe.l * crowdWeight;
        hit.vibe = {
          h: (hit.vibe.h * hit.count + t.vibe.h) / n,
          s: (hit.vibe.s * hit.count + t.vibe.s) / n,
          l: (weightedOldL + weightedNewL) / (hit.count + crowdWeight),
        };
          hit.count = n;
        } else {
          clusters.push({ x: t.x, y: t.y, r: t.r, count: 1, vibe: t.vibe });
        }
      });

      return clusters;
    } catch (e) {
      console.error('[cluster-worker]', e);
      if (import.meta.env.DEV) throw e;
      return [];
    }
  },
};

Comlink.expose(api);