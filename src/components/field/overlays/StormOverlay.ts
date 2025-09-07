import * as PIXI from 'pixi.js';
import { P3B } from '@/lib/field/constants';
import { stormTokens } from '@/lib/field/visualTokens';
import { ADD_BLEND } from '@/lib/pixi/blendModes';
import type { StormGroup } from '@/lib/field/types';

export class StormOverlay {
  private container: PIXI.Container;
  private halos = new Map<string, PIXI.Graphics>();
  private lastSeen = new Map<string, number>();

  constructor(parent: PIXI.Container) {
    this.container = new PIXI.Container();
    parent.addChild(this.container);
  }

  update(groups: StormGroup[], zoom: number) {
    if (zoom < P3B.STORMS.MIN_ZOOM) { 
      this.clear(); 
      return; 
    }

    const keep = new Set<string>();
    const color = parseInt(stormTokens.haloColor.slice(1), 16);
    const now = performance.now();

    for (const g of groups.slice(0, P3B.STORMS.MAX_GROUPS)) {
      const id = g.id; 
      keep.add(id);
      let h = this.halos.get(id);
      if (!h) {
        h = new PIXI.Graphics();
        h.blendMode = ADD_BLEND;
        this.halos.set(id, h); 
        this.container.addChild(h);
      }
      // rebuild halo each update (cheap)
      h.clear();
      const alpha = stormTokens.haloAlpha * (0.6 + 0.4 * g.intensity);
      h.stroke({ width: 3, color, alpha });
      h.circle(g.x, g.y, g.radius);
      h.circle(g.x, g.y, Math.max(6, g.radius * 0.25)).fill({ color, alpha: alpha * 0.15 });

      this.lastSeen.set(id, now);
    }

    // fade & prune
    for (const [id, gfx] of this.halos) {
      const seen = this.lastSeen.get(id) ?? now;
      const age = now - seen;
      const k = Math.max(0, 1 - age / stormTokens.ttlMs);
      gfx.alpha = 0.2 + 0.8 * k;
      if (!keep.has(id) && age > stormTokens.ttlMs) {
        this.container.removeChild(gfx); 
        gfx.destroy();
        this.halos.delete(id); 
        this.lastSeen.delete(id);
      }
    }
  }

  clear() { 
    for (const [, g] of this.halos) { 
      this.container.removeChild(g); 
      g.destroy(); 
    } 
    this.halos.clear(); 
    this.lastSeen.clear(); 
  }
  
  destroy() { 
    this.clear(); 
    this.container.destroy(); 
  }
}