
import * as PIXI from 'pixi.js';

export class GraphicsPool {
  private pool: PIXI.Graphics[] = [];
  private active: Set<PIXI.Graphics> = new Set();
  private maxPoolSize: number;

  constructor(initialSize = 50, maxSize = 200) {
    this.maxPoolSize = maxSize;
    
    // Pre-create initial graphics objects
    for (let i = 0; i < initialSize; i++) {
      const graphics = new PIXI.Graphics();
      this.pool.push(graphics);
    }
  }

  acquire(): PIXI.Graphics {
    let graphics = this.pool.pop();
    
    if (!graphics) {
      graphics = new PIXI.Graphics();
    }
    
    this.active.add(graphics);
    graphics.clear();
    graphics.visible = true;
    graphics.renderable = true;
    
    return graphics;
  }

  release(graphics: PIXI.Graphics): void {
    if (!this.active.has(graphics)) return;
    
    this.active.delete(graphics);
    graphics.clear();
    graphics.visible = false;
    graphics.renderable = false;
    
    // Only return to pool if we haven't exceeded max size
    if (this.pool.length < this.maxPoolSize) {
      this.pool.push(graphics);
    } else {
      // Destroy excess graphics to prevent memory leaks
      graphics.destroy();
    }
  }

  releaseAll(): void {
    this.active.forEach(graphics => this.release(graphics));
  }

  getActiveCount(): number {
    return this.active.size;
  }

  getPoolSize(): number {
    return this.pool.length;
  }
}
