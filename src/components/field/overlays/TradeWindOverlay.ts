import * as PIXI from 'pixi.js';
import { windTokens } from '@/lib/field/visualTokens';
import type { WindPath } from '@/lib/field/types';
import { P4 } from '@/lib/field/constants';

type WindsMetrics = { fps?: number; drawCalls?: number; workerTime?: number };
type WindsQuality = {
  tier: 'low' | 'mid' | 'high';
  maxArrows: number;       // overlay capacity target (paths * ~20 arrows by default)
  strideBase: number;      // lower = denser (defaults to 6)
  strideMin: number;       // min spacing between arrows (defaults to 4)
  strideMax: number;       // max spacing (defaults to 18)
};

const ADD_BLEND = (PIXI as any)?.BLEND_MODES?.ADD ?? ('add' as any);

// small hash for stable per-path phase offset
function hash32(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619 >>> 0;
  return h >>> 0;
}

export class TradeWindOverlay {
  private container: PIXI.ParticleContainer;
  private arrows: PIXI.Sprite[] = [];
  private capacity: number;
  private q: WindsQuality;
  private lastStride = new Map<string, number>();   // hysteresis cache

  constructor(parent: PIXI.Container, capacity = P4.WINDS.MAX_PATHS * 20) {
    this.capacity = capacity;
    this.q = { tier: 'mid', maxArrows: capacity, strideBase: 6, strideMin: 4, strideMax: 18 };
    this.container = new (PIXI as any).ParticleContainer(capacity, {
      position: true, rotation: true, alpha: true, scale: true, tint: true
    });
    parent.addChild(this.container);

    for (let i = 0; i < capacity; i++) {
      const s = new PIXI.Sprite(PIXI.Texture.WHITE);
      s.anchor.set(0.5);
      s.visible = false;
      s.blendMode = ADD_BLEND;
      this.arrows.push(s);
      this.container.addChild(s);
    }
  }

  setCapacity(n: number) {
    this.capacity = Math.max(0, Math.min(n, this.arrows.length));
    this.q.maxArrows = this.capacity;
  }

  /** Apply device-tier quality (call on tier changes) */
  setQuality(q: Partial<WindsQuality>) {
    this.q = { ...this.q, ...q };
    // keep capacity and quality aligned
    if (q.maxArrows != null) this.setCapacity(q.maxArrows);
  }

  /** Derive a budget factor from live metrics ( >1 = lighten workload ) */
  private budgetFactor(m?: WindsMetrics): number {
    if (!m) return 1;
    let f = 1;
    if ((m.fps ?? 60) < 55) f *= 1.25;
    if ((m.fps ?? 60) < 50) f *= 1.5;
    if ((m.drawCalls ?? 0) > 400) f *= 1.15;
    if ((m.workerTime ?? 0) > 8) f *= 1.1;
    return Math.min(2, Math.max(1, f));
  }

  /** Compute stride for a path (higher=skip more points) */
  private computeStride(path: WindPath, zoom: number, budget: number): number {
    const { strideBase, strideMin, strideMax, tier } = this.q;

    // base: smaller at higher zoom (more detail), larger at low zoom
    let stride = strideBase * (zoom < 14 ? 1.6 : zoom < 16 ? 1.3 : zoom > 17 ? 0.9 : 1.0);

    // make dense for stronger/supported paths
    const strengthBias = 1 / (1 + 0.9 * path.strength + 0.6 * path.support);
    stride *= strengthBias;

    // device tier bias
    if (tier === 'low') stride *= 1.25;
    if (tier === 'high') stride *= 0.95;

    // frame budget bias (lift under load)
    stride *= budget;

    // clamp
    stride = Math.max(strideMin, Math.min(strideMax, Math.round(stride)));
    return this.smoothStride(path.id, stride, strideMin, strideMax);
  }

  /** Hysteresis: limit stride change to ±1 per update; remember last per path id */
  private smoothStride(id: string, raw: number, min: number, max: number): number {
    const prev = this.lastStride.get(id) ?? raw;
    if (Math.abs(raw - prev) <= 1) return prev; // sticky zone
    const step = Math.sign(raw - prev);         // move by 1 toward target
    const next = Math.max(min, Math.min(max, prev + step));
    this.lastStride.set(id, next);
    return next;
  }

  /** Update with optional perf metrics for adaptive stride */
  update(paths: WindPath[], zoom: number, metrics?: WindsMetrics) {
    if (!paths?.length || zoom < P4.WINDS.MIN_ZOOM) {
      for (const s of this.arrows) s.visible = false;
      return;
    }

    // cap number of path samples by quality.maxArrows
    const maxArrows = this.capacity;
    const budget = this.budgetFactor(metrics);

    let idx = 0;
    const toHex = (h: string) => parseInt(h.slice(1), 16);

    // track used ids to prune hysteresis cache
    const used = new Set<string>();

    for (const p of paths.slice(0, P4.WINDS.MAX_PATHS)) {
      if (idx >= maxArrows) break;
      const stride = this.computeStride(p, zoom, budget);
      used.add(p.id);
      // stable phase offset so arrows don't pop when stride changes
      const phase = hash32(p.id) % Math.max(1, stride);

      for (let i = phase; i < p.pts.length - 1 && idx < maxArrows; i += stride) {
        const a = p.pts[i], b = p.pts[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const angle = Math.atan2(dy, dx);

        const s = this.arrows[idx++];
        s.position.set(a.x, a.y);
        s.rotation = angle;

        // arrow size & opacity scale with path strength/support
        const strength = p.strength;
        s.width = windTokens.arrowLenPx * (0.8 + 0.6 * strength);
        s.height = windTokens.widthPx;
        s.alpha = windTokens.alpha * (0.6 + 0.4 * p.support);

        // tint by strength band
        const tint = strength > 0.66 ? windTokens.colorHigh
                   : strength > 0.33 ? windTokens.colorMid
                                      : windTokens.colorLow;
        s.tint = toHex(tint);
        s.visible = true;
      }
    }

    // hide remainder
    for (; idx < this.arrows.length; idx++) this.arrows[idx].visible = false;

    // prune hysteresis cache to avoid leaks
    if (this.lastStride.size > 0) {
      for (const id of this.lastStride.keys()) {
        if (!used.has(id)) this.lastStride.delete(id);
      }
    }
  }

  tick(_deltaMS: number) { 
    // Optional: sinusoidal alpha wiggle using windTokens.dashHz 
  }
  
  destroy() { 
    this.container.destroy({ children: true }); 
  }
}