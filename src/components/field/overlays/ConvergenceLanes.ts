import * as PIXI from 'pixi.js';
import { P3 } from '@/lib/field/constants';
import { laneTokens } from '@/lib/field/visualTokens';
import { ADD_BLEND } from '@/lib/pixi/blendModes';
import type { LaneSegment } from '@/lib/field/types';

export class ConvergenceLanes {
  private container: PIXI.Container;
  private graphicsById = new Map<string, PIXI.Graphics>();
  private ttl = new Map<string, number>();
  private laneHash = new Map<string, string>(); // Cache geometry hash to avoid rebuilds
  private capacity: number = P3.LANES.MAX_LANES;

  constructor(parent: PIXI.Container, capacity?: number) {
    this.container = new PIXI.Container();
    this.capacity = capacity || P3.LANES.MAX_LANES;
    parent.addChild(this.container);
  }

  // Performance: cheap hash of lane points to avoid geometry rebuilds
  private hashPts(pts: Array<{x: number; y: number}>): string {
    let h = 0;
    // Sample every 3rd point for speed
    for (let i = 0; i < pts.length; i += 3) {
      h = (h * 31 + (pts[i].x | 0)) | 0;
      h = (h * 31 + (pts[i].y | 0)) | 0;
    }
    return h.toString(16);
  }

  // Allow dynamic capacity adjustment for device tiers
  setCapacity(capacity: number) {
    this.capacity = Math.min(capacity, P3.LANES.MAX_LANES);
  }

  update(lanes: LaneSegment[], zoom: number) {
    if (zoom < P3.LANES.MIN_ZOOM) { 
      this.clearAll(); 
      return; 
    }

    const now = performance.now();
    const keep = new Set<string>();

    const toHex = (hex: string) => parseInt(hex.slice(1), 16);
    const strongHex = toHex(laneTokens.color.strong);
    const baseHex = toHex(laneTokens.color.base);

    for (let i = 0; i < Math.min(lanes.length, this.capacity); i++) {
      const ln = lanes[i];
      if (ln.conf < P3.LANES.PROB_MIN || ln.etaMs > P3.LANES.ETA_MAX_MS) continue;
      keep.add(ln.id);

      // Check if geometry changed using hash
      const currentHash = this.hashPts(ln.pts);
      const existingHash = this.laneHash.get(ln.id);
      
      let g = this.graphicsById.get(ln.id);
      if (!g) {
        g = new PIXI.Graphics();
        g.blendMode = ADD_BLEND;
        this.graphicsById.set(ln.id, g);
        this.container.addChild(g);
      }

      // Only rebuild geometry if points changed
      if (currentHash !== existingHash) {
        this.laneHash.set(ln.id, currentHash);
        
        // Rebuild geometry (cheap polyline)
        g.clear();
        const col = ln.conf >= 0.7 ? strongHex : baseHex;
        g.stroke({ width: laneTokens.strokePx, color: col, alpha: 0.85 });
        const first = ln.pts[0];
        g.moveTo(first.x, first.y);
        for (let j = 1; j < ln.pts.length; j++) {
          g.lineTo(ln.pts[j].x, ln.pts[j].y);
        }

        // Small meet dot
        const end = ln.pts[ln.pts.length - 1];
        g.circle(end.x, end.y, laneTokens.dotRadiusPx).fill({ color: col, alpha: 1 });
      }

      this.ttl.set(ln.id, now); // refresh life
    }

    // Fade & prune
    for (const [id, g] of this.graphicsById) {
      const born = this.ttl.get(id) ?? now;
      const age = now - born;
      const k = Math.max(0, 1 - age / P3.LANES.ETA_MAX_MS);
      g.alpha = 0.3 + 0.7 * k;
      if (!keep.has(id) && age > 2200) { // short UI TTL if no longer reported
        g.destroy();
        this.graphicsById.delete(id);
        this.ttl.delete(id);
        this.laneHash.delete(id); // Clear cached hash
      }
    }
  }

  tick(_deltaMS: number) { 
    // animate dash phase later if needed 
  }

  clearAll() {
    for (const [, g] of this.graphicsById) g.destroy();
    this.graphicsById.clear();
    this.ttl.clear();
    this.laneHash.clear(); // Clear geometry cache
  }

  destroy() { 
    this.clearAll(); 
    this.container.destroy(); 
  }
}