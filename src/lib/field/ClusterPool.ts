import * as PIXI from 'pixi.js';

/**
 * Performance-optimized cluster sprite pooling system
 * Eliminates Graphics creation/destruction per frame to prevent GC churn
 */
export class ClusterPool {
  private byId = new Map<string, PIXI.Graphics>();
  
  constructor(private container: PIXI.Container) {}

  /**
   * Get or create cluster sprite for the given ID
   */
  get(id: string): PIXI.Graphics {
    let graphics = this.byId.get(id);
    if (!graphics) {
      graphics = new PIXI.Graphics();
      this.container.addChild(graphics);
      this.byId.set(id, graphics);
    }
    return graphics;
  }

  /**
   * Remove sprites for clusters that are no longer active
   * Prevents memory leaks and visual artifacts from stale clusters
   */
  prune(activeIds: Set<string>): void {
    for (const [id, graphics] of this.byId) {
      if (!activeIds.has(id)) {
        this.container.removeChild(graphics);
        graphics.destroy();
        this.byId.delete(id);
      }
    }
  }

  /**
   * Clean up all sprites
   */
  destroy(): void {
    for (const [id, graphics] of this.byId) {
      this.container.removeChild(graphics);
      graphics.destroy();
    }
    this.byId.clear();
  }

  /**
   * Get pool statistics for monitoring
   */
  getStats() {
    return {
      poolSize: this.byId.size,
      containerChildren: this.container.children.length
    };
  }
}