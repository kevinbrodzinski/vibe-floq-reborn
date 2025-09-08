/**
 * Proximity Cascade Ripple Overlay
 * Creates ripple bursts when ≥3 actors converge within proximity and time window
 */

import * as PIXI from 'pixi.js';

const ADD_BLEND = (PIXI as any).BLEND_MODES?.ADD ?? ('add' as any);

export type CascadeEvent = {
  id: string;        // stable id for cooldown (e.g., gridKey or meeting id)
  x: number;         // px
  y: number;         // px
  weight: number;    // 0..1 (strength = #actors & confidence)
  born?: number;     // set by overlay
};

type Ripple = { 
  g: PIXI.Graphics; 
  born: number; 
  ttl: number; 
  r0: number; 
  r1: number; 
  alpha0: number; 
  color: number 
};

export class ProximityCascadeOverlay {
  private container = new PIXI.Container();
  private pool: PIXI.Graphics[] = [];
  private ripples: Ripple[] = [];
  private cooldown = new Map<string, number>(); // id -> expiry
  private ttlMs = 1200;
  private tier: 'low' | 'mid' | 'high' = 'high';
  private maxPerTick = 4;        // tier-capped
  private maxAlive = 16;         // tier-capped

  constructor(parent: PIXI.Container) {
    this.container.label = 'ProximityCascade';
    parent.addChild(this.container);
    
    // Set DEV global for debugging
    if (import.meta.env.DEV) {
      (window as any).__cascadeOverlay = this;
    }
  }

  setQuality(q: { tier: 'low' | 'mid' | 'high' }) {
    this.tier = q.tier;
    this.maxPerTick = this.tier === 'low' ? 0 : this.tier === 'mid' ? 2 : 4;
    this.maxAlive = this.tier === 'low' ? 0 : this.tier === 'mid' ? 8 : 16;
  }

  /** Spawn ripples for new cascade events (respect cooldown & caps) */
  spawn(events: CascadeEvent[]) {
    if (this.tier === 'low') return;
    const now = performance.now();
    let spawned = 0;

    for (const e of events) {
      if (spawned >= this.maxPerTick) break;
      const cd = this.cooldown.get(e.id);
      if (cd && cd > now) continue;
      if (this.ripples.length >= this.maxAlive) break;

      const g = this.pool.pop() ?? new PIXI.Graphics();
      g.blendMode = ADD_BLEND;

      const strength = Math.min(1, Math.max(0, e.weight));
      const ripple: Ripple = {
        g,
        born: now,
        ttl: this.ttlMs,
        r0: 24,                      // start radius
        r1: 100 + 80 * strength,     // end radius
        alpha0: 0.35 + 0.4 * strength, // start alpha
        color: 0xffffff
      };

      g.clear();
      g.position.set(e.x, e.y);
      this.container.addChild(g);
      this.ripples.push(ripple);

      this.cooldown.set(e.id, now + 1200); // 1.2s cooldown per hotspot
      spawned++;
    }
  }

  /** Draw & age ripples; call every frame within frame budget */
  update(deltaMS: number) {
    const now = performance.now();
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      const t = (now - r.born) / r.ttl; // 0..1
      if (t >= 1) { 
        this.recycle(i); 
        continue; 
      }

      const radius = r.r0 + (r.r1 - r.r0) * t;
      const alpha = r.alpha0 * (1 - t);

      // Draw ring
      const g = r.g;
      g.clear();
      g.circle(0, 0, radius).stroke({ width: 3, color: r.color, alpha });
      
      // Faint fill pulse for early phase
      if (t < 0.5) {
        g.circle(0, 0, radius * 0.6).fill({ color: r.color, alpha: alpha * 0.25 });
      }
    }

    // Purge expired cooldowns
    if (this.cooldown.size) {
      const t = performance.now();
      for (const [id, exp] of this.cooldown) {
        if (t > exp) this.cooldown.delete(id);
      }
    }
  }

  setAlpha(a: number) { 
    this.container.alpha = a; 
  }

  private recycle(i: number) {
    const r = this.ripples[i];
    if (r.g.parent) this.container.removeChild(r.g);
    r.g.clear();
    this.pool.push(r.g);
    this.ripples.splice(i, 1);
  }

  /**
   * Get performance stats
   */
  getStats() {
    return {
      activeRipples: this.ripples.length,
      poolAvailable: this.pool.length,
      cooldownEntries: this.cooldown.size
    };
  }

  destroy() {
    // Clear active ripples
    for (const r of this.ripples) { 
      r.g.clear(); 
      if (r.g.parent) this.container.removeChild(r.g); 
      this.pool.push(r.g); 
    }
    this.ripples.length = 0;
    
    // Clear pool
    for (const g of this.pool) g.destroy();
    this.pool.length = 0;
    
    // Clear cooldowns
    this.cooldown.clear();
    
    // Clean up container
    this.container.removeChildren();
    this.container.destroy({ children: true });
  }
}