import * as PIXI from 'pixi.js';
import type { VibeToken } from '@/types/field';
import { vibeToTint } from '@/lib/vibe/tokens';

interface TrailSegment {
  sprite: PIXI.Sprite;
  timestamp: number;
}

/**
 * Production-ready trail system with ParticleContainer and LOD gates
 * Patent-compliant decay (2-60s) with performance budgets
 */
export class TrailSystem {
  private container: PIXI.ParticleContainer;
  private pool: PIXI.Sprite[] = [];
  private trails = new Map<string, TrailSegment[]>();
  private maxSegmentsPerTrail = 18;
  private maxTrails = 600;
  private readonly MIN_DECAY_TIME = 2000; // 2s minimum (patent spec)
  private readonly MAX_DECAY_TIME = 60000; // 60s maximum (patent spec)

  constructor(parent: PIXI.Container, capacity = 4000) {
    // Use ParticleContainer for massive performance improvement
    this.container = new PIXI.ParticleContainer();
    parent.addChild(this.container);
    
    // Pre-warm sprite pool
    for (let i = 0; i < capacity; i++) {
      const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
      sprite.anchor.set(0.5);
      sprite.width = 2; // TODO: Use design token
      sprite.height = 2;
      this.pool.push(sprite);
    }
  }

  /**
   * Add trail point with LOD and privacy gates
   */
  addPoint(
    clusterId: string, 
    x: number, 
    y: number, 
    vibe: VibeToken,
    count: number,
    zoom: number,
    speed: number
  ) {
    // LOD gates: only show trails at high zoom with sufficient crowd
    const kMin = 5; // k-anonymity threshold
    const minZoom = 16; // street level detail
    const minSpeed = 0.02; // m/s minimum movement
    
    if (zoom < minZoom || count < kMin || speed < minSpeed) {
      return; // Skip trail for privacy/performance
    }

    let segments = this.trails.get(clusterId);
    if (!segments) {
      if (this.trails.size >= this.maxTrails) {
        this.evictOldest();
      }
      segments = [];
      this.trails.set(clusterId, segments);
    }

    // Acquire sprite from pool
    const sprite = this.pool.pop() ?? new PIXI.Sprite(PIXI.Texture.WHITE);
    sprite.position.set(x, y);
    sprite.alpha = 1.0;
    sprite.tint = vibeToTint(vibe);
    sprite.width = 2;
    sprite.height = 2;
    this.container.addChild(sprite);

    segments.push({ sprite, timestamp: performance.now() });

    // Limit trail length
    while (segments.length > this.maxSegmentsPerTrail) {
      this.recycle(clusterId, segments.shift()!);
    }
  }

  /**
   * Update with real deltaMS from PIXI ticker
   */
  update(deltaMS: number, afterglowIntensity = 0.5) {
    const now = performance.now();
    
    // Patent-compliant decay time calculation
    const decayTime = this.MIN_DECAY_TIME + 
      (this.MAX_DECAY_TIME - this.MIN_DECAY_TIME) * afterglowIntensity;

    for (const [clusterId, segments] of this.trails.entries()) {
      for (let i = segments.length - 1; i >= 0; i--) {
        const segment = segments[i];
        const age = now - segment.timestamp;
        
        // Exponential decay with position-based fade
        const timeFade = Math.max(0, 1 - (age / decayTime));
        const positionFade = (i + 1) / segments.length; // newer = brighter
        const alpha = timeFade * positionFade * afterglowIntensity;
        
        if (alpha < 0.01) {
          this.recycle(clusterId, segments.splice(i, 1)[0]);
        } else {
          segment.sprite.alpha = alpha;
        }
      }
      
      if (segments.length === 0) {
        this.trails.delete(clusterId);
      }
    }
  }

  clearAll() {
    for (const [clusterId, segments] of this.trails) {
      segments.forEach(segment => this.recycle(clusterId, segment));
    }
    this.trails.clear();
  }

  private recycle(clusterId: string, segment: TrailSegment) {
    this.container.removeChild(segment.sprite);
    this.pool.push(segment.sprite);
  }

  private evictOldest() {
    const firstKey = this.trails.keys().next().value;
    if (!firstKey) return;
    
    const segments = this.trails.get(firstKey)!;
    segments.forEach(segment => this.recycle(firstKey, segment));
    this.trails.delete(firstKey);
  }

  /**
   * Performance stats for observability
   */
  getStats() {
    return {
      activeTrails: this.trails.size,
      totalSegments: Array.from(this.trails.values()).reduce((sum, segs) => sum + segs.length, 0),
      poolSize: this.pool.length,
      containerChildren: this.container.children.length
    };
  }
}