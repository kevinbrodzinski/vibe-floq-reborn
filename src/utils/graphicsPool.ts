import { Graphics } from 'pixi.js';

const MAX_SIZE = 200;

export class GraphicsPool {
  private pool: Graphics[] = [];
  private active = new Set<Graphics>();

  acquire(): Graphics {
    let graphics = this.pool.pop();
    if (!graphics) {
      graphics = new Graphics();
    }
    this.active.add(graphics);
    return graphics;
  }

  release(graphics: Graphics): void {
    if (this.active.has(graphics)) {
      this.active.delete(graphics);
      // don't clear if the renderer (webGL context) is gone
      if (!graphics.destroyed && (graphics as any)._webGL) {
        graphics.clear();
      }
      graphics.removeFromParent();
      
      // Cap pool size to prevent unbounded growth
      if (this.pool.length > MAX_SIZE) {
        graphics.destroy(true);
      } else {
        this.pool.push(graphics);
      }
    }
  }

  releaseAll(): void {
    this.active.forEach(graphics => {
      // don't clear if the renderer (webGL context) is gone
      if (!graphics.destroyed && (graphics as any)._webGL) {
        graphics.clear();
      }
      graphics.removeFromParent();
      
      // Cap pool size and prevent duplicate pooling
      if (this.pool.length > MAX_SIZE) {
        graphics.destroy(true);
      } else if (!this.pool.includes(graphics)) {
        this.pool.push(graphics);
      }
    });
    this.active.clear();
  }
}