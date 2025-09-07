import * as PIXI from 'pixi.js';
import { auroraTokens } from '@/lib/field/visualTokens';
import type { AuroraEventLite } from '@/lib/field/types';
import { P4 } from '@/lib/field/constants';

const ADD_BLEND = (PIXI as any)?.BLEND_MODES?.ADD ?? ('add' as any);

type AuroraQuality = {
  tier: 'low' | 'mid' | 'high';
  maxConcurrent: number;
  intensityMin: number;
  shader: boolean;           // reserved for high-tier shader path
};

type AuroraTuner = {
  enabled: boolean;
  min: number;     // lower bound for intensityMin
  max: number;     // upper bound
  stepUp: number;  // how fast to raise threshold under load
  stepDown: number;// how fast to lower threshold when safe
  target: number;  // desired active auroras by tier
  cooldownMs: number;
  lastTune: number;
};

export class AuroraOverlay {
  private container: PIXI.Container;
  private rings: PIXI.Graphics[] = [];
  private q: AuroraQuality;
  private tuner: AuroraTuner = {
    enabled: false, 
    min: 0.65, 
    max: 0.9, 
    stepUp: 0.02, 
    stepDown: 0.01, 
    target: 2, 
    cooldownMs: 1500, 
    lastTune: 0
  };

  constructor(parent: PIXI.Container) {
    this.container = new PIXI.Container();
    parent.addChild(this.container);
    this.q = { tier: 'mid', maxConcurrent: P4.AURORA.MAX_CONCURRENT, intensityMin: P4.AURORA.INTENSITY_MIN, shader: false };
  }

  /** Apply device-tier quality (call on tier changes) */
  setQuality(q: Partial<AuroraQuality>) {
    this.q = { ...this.q, ...q };
  }

  /** Optional: configure auto-tuner per tier (call on tier change) */
  setTuner(t?: Partial<AuroraTuner>) { 
    this.tuner = { ...this.tuner, ...t, enabled: true }; 
  }

  /** Auto-tune threshold by fps + active count (call after update()) */
  autoTune(metrics: { fps?: number }, activeCount: number) {
    if (!this.tuner.enabled) return;
    const now = performance.now();
    if (now - this.tuner.lastTune < this.tuner.cooldownMs) return;

    let thr = this.q.intensityMin;
    const fps = metrics.fps ?? 60;

    if (fps < 55) {
      // under load: raise intensity threshold (fewer auroras)
      thr = Math.min(this.tuner.max, thr + this.tuner.stepUp);
    } else if (fps > 59 && activeCount < this.tuner.target) {
      // plenty of headroom: allow a bit more by lowering threshold
      thr = Math.max(this.tuner.min, thr - this.tuner.stepDown);
    }

    if (thr !== this.q.intensityMin) {
      this.q.intensityMin = +thr.toFixed(2);
      this.tuner.lastTune = now;
      if (import.meta.env.DEV) console.info('[aurora] tuned intensityMin →', this.q.intensityMin);
    }
  }

  update(events: AuroraEventLite[], zoom: number): number {
    if (zoom < P4.AURORA.MIN_ZOOM) { this.clear(); return 0; }

    // intensity gating + capacity
    const list = (events ?? [])
      .filter(e => e.intensity >= this.q.intensityMin)
      .slice(0, this.q.maxConcurrent);
    
    // grow pool as needed
    while (this.rings.length < list.length) {
      const g = new PIXI.Graphics(); g.blendMode = ADD_BLEND;
      this.rings.push(g); this.container.addChild(g);
    }
    
    // draw active
    for (let i=0;i<list.length;i++){
      const e = list[i], g = this.rings[i];
      g.clear();
      const col = parseInt(auroraTokens.colors[i % auroraTokens.colors.length].slice(1),16);
      const alpha = auroraTokens.alpha * e.intensity;
      const r = Math.min(auroraTokens.maxRadiusPx, e.radiusPx);
      g.circle(e.center.x, e.center.y, r).stroke({ width: 2, color: col, alpha });
      g.circle(e.center.x, e.center.y, Math.max(8, r*0.4)).fill({ color: col, alpha: alpha * 0.25 });
      g.alpha = alpha;
    }

    // hide extras
    for (let i=list.length;i<this.rings.length;i++) this.rings[i].clear();
    
    return list.length; // active auroras
  }

  clear() { 
    for (const g of this.rings) g.clear(); 
  }
  
  destroy() { 
    this.clear(); 
    this.container.destroy(); 
  }
}