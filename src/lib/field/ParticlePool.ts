import * as PIXI from 'pixi.js';

/**
 * O(1) particle pool with free-list for maximum performance
 * Eliminates per-frame allocation/GC during particle emission
 */
export class ParticlePool {
  private pool: PIXI.Sprite[] = [];
  private free: PIXI.Sprite[] = [];
  private active = new Set<PIXI.Sprite>();
  private maxSize: number;

  constructor(
    private container: PIXI.Container,
    private texture: PIXI.Texture,
    initialSize = 100,
    maxSize = 500
  ) {
    this.maxSize = maxSize;
    
    // Pre-create initial particles with static properties set once
    for (let i = 0; i < initialSize; i++) {
      const sprite = this.createParticle();
      this.pool.push(sprite);
      this.free.push(sprite);
    }
  }

  private createParticle(): PIXI.Sprite {
    const sprite = new PIXI.Sprite(this.texture);
    sprite.anchor.set(0.5);
    sprite.blendMode = 'add';
    sprite.visible = false;
    return sprite;
  }

  /**
   * O(1) acquire from free list
   */
  acquire(): PIXI.Sprite | null {
    let sprite = this.free.pop();
    
    if (!sprite && this.pool.length < this.maxSize) {
      sprite = this.createParticle();
      this.pool.push(sprite);
    }
    
    if (!sprite) return null; // Pool exhausted
    
    sprite.visible = true;
    this.container.addChild(sprite);
    this.active.add(sprite);
    return sprite;
  }

  /**
   * O(1) recycle to free list
   */
  release(sprite: PIXI.Sprite): void {
    if (!this.active.has(sprite)) return;
    
    sprite.visible = false;
    this.container.removeChild(sprite);
    this.active.delete(sprite);
    this.free.push(sprite);
  }

  /**
   * Release all active particles
   */
  releaseAll(): void {
    this.active.forEach(sprite => {
      sprite.visible = false;
      this.container.removeChild(sprite);
      this.free.push(sprite);
    });
    this.active.clear();
  }

  /**
   * Get performance stats
   */
  getStats() {
    return {
      poolSize: this.pool.length,
      freeCount: this.free.length,
      activeCount: this.active.size,
      maxSize: this.maxSize
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.releaseAll();
    this.pool.forEach(sprite => sprite.destroy());
    this.pool.length = 0;
    this.free.length = 0;
  }
}