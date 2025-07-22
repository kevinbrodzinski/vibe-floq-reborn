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

const MAX_DIST = 32;   /* px within which tiles merge – we'll tweak later */

const api = {
  cluster(tiles: RawTile[], zoom = 11): Cluster[] {
    try {
      const threshold = MAX_DIST / 2 ** (zoom - 11);
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
          hit.vibe = {
            h: (hit.vibe.h * hit.count + t.vibe.h) / n,
            s: (hit.vibe.s * hit.count + t.vibe.s) / n,
            l: (hit.vibe.l * hit.count + t.vibe.l) / n,
          };
          hit.count = n;
        } else {
          clusters.push({ x: t.x, y: t.y, r: t.r, count: 1, vibe: t.vibe });
        }
      });

      return clusters;
    } catch (e) {
      console.error('[cluster-worker]', e);
      return [];
    }
  },
};

Comlink.expose(api);