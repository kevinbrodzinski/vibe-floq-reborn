import { Graphics } from 'pixi.js';

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
      this.pool.push(graphics);
    }
  }

  releaseAll(): void {
    this.active.forEach(graphics => {
      // don't clear if the renderer (webGL context) is gone
      if (!graphics.destroyed && (graphics as any)._webGL) {
        graphics.clear();
      }
      graphics.removeFromParent();
      this.pool.push(graphics);
    });
    this.active.clear();
  }
}