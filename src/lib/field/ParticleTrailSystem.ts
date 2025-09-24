import * as PIXI from 'pixi.js';
import { SpritePool } from '@/lib/pixi/SpritePool';

interface TrailSegment {
  x: number;
  y: number;
  alpha: number;
  timestamp: number;
  sprite: PIXI.Sprite;
}

interface ParticleTrail {
  segments: TrailSegment[];
  maxSegments: number;
  decayRate: number;
}

/**
 * Phase 1: Particle Trail System for Field Canvas
 * Manages afterglow trails for particles using existing sprite pooling
 */
export class ParticleTrailSystem {
  private trails = new Map<string, ParticleTrail>();
  private spritePool: SpritePool<PIXI.Sprite>;
  private container: PIXI.Container;
  private maxTrails = 500; // Performance limit

  constructor(container: PIXI.Container) {
    this.container = container;
    this.spritePool = new SpritePool(() => {
      const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
      sprite.width = 2;
      sprite.height = 2;
      sprite.anchor.set(0.5);
      return sprite;
    });
    this.spritePool.preAllocate(200);
  }

  /**
   * Add a new position to a particle's trail
   */
  addPosition(particleId: string, x: number, y: number, vibe: { h: number; s: number; l: number }) {
    let trail = this.trails.get(particleId);
    
    if (!trail) {
      // Create new trail if at capacity, remove oldest
      if (this.trails.size >= this.maxTrails) {
        const oldestId = this.trails.keys().next().value;
        this.clearTrail(oldestId);
      }
      
      trail = {
        segments: [],
        maxSegments: 15, // 15 segments for smooth trail
        decayRate: 0.95  // Exponential decay
      };
      this.trails.set(particleId, trail);
    }

    // Create new trail segment
    const sprite = this.spritePool.acquire(particleId + '_' + Date.now());
    sprite.x = x;
    sprite.y = y;
    sprite.alpha = 1.0;
    sprite.tint = this.hslToTint(vibe.h, vibe.s, vibe.l);
    this.container.addChild(sprite);

    const segment: TrailSegment = {
      x,
      y,
      alpha: 1.0,
      timestamp: Date.now(),
      sprite
    };

    trail.segments.push(segment);

    // Remove excess segments
    while (trail.segments.length > trail.maxSegments) {
      const oldSegment = trail.segments.shift()!;
      this.container.removeChild(oldSegment.sprite);
      this.spritePool.release(particleId + '_' + oldSegment.timestamp);
    }
  }

  /**
   * Update all trails with decay animation
   */
  update(deltaTime: number) {
    for (const [particleId, trail] of this.trails.entries()) {
      let hasActiveSegments = false;

      for (let i = trail.segments.length - 1; i >= 0; i--) {
        const segment = trail.segments[i];
        const age = Date.now() - segment.timestamp;
        
        // Fade based on position in trail
        const positionFade = 1 - (i / trail.segments.length);
        const timeFade = Math.max(0, 1 - (age / 3000)); // 3 second max age
        
        segment.alpha = positionFade * timeFade * trail.decayRate;
        segment.sprite.alpha = segment.alpha;

        if (segment.alpha < 0.05) {
          // Remove dead segment
          this.container.removeChild(segment.sprite);
          this.spritePool.release(particleId + '_' + segment.timestamp);
          trail.segments.splice(i, 1);
        } else {
          hasActiveSegments = true;
        }
      }

      // Remove empty trails
      if (!hasActiveSegments) {
        this.trails.delete(particleId);
      }
    }
  }

  /**
   * Clear a specific trail
   */
  clearTrail(particleId: string) {
    const trail = this.trails.get(particleId);
    if (trail) {
      trail.segments.forEach(segment => {
        this.container.removeChild(segment.sprite);
        this.spritePool.release(particleId + '_' + segment.timestamp);
      });
      this.trails.delete(particleId);
    }
  }

  /**
   * Clear all trails
   */
  clearAll() {
    for (const particleId of this.trails.keys()) {
      this.clearTrail(particleId);
    }
  }

  /**
   * Convert HSL to PIXI tint
   */
  private hslToTint(h: number, s: number, l: number): number {
    // Convert HSL (0-360, 0-100, 0-100) to RGB hex
    const c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l / 100 - c / 2;

    let r = 0, g = 0, b = 0;
    if (0 <= h && h < 60) {
      [r, g, b] = [c, x, 0];
    } else if (60 <= h && h < 120) {
      [r, g, b] = [x, c, 0];
    } else if (120 <= h && h < 180) {
      [r, g, b] = [0, c, x];
    } else if (180 <= h && h < 240) {
      [r, g, b] = [0, x, c];
    } else if (240 <= h && h < 300) {
      [r, g, b] = [x, 0, c];
    } else if (300 <= h && h < 360) {
      [r, g, b] = [c, 0, x];
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return (r << 16) | (g << 8) | b;
  }

  /**
   * Get performance stats
   */
  getStats() {
    return {
      activeTrails: this.trails.size,
      totalSegments: Array.from(this.trails.values()).reduce((sum, trail) => sum + trail.segments.length, 0),
      poolStats: this.spritePool.getStats()
    };
  }
}