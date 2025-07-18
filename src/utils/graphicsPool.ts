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
      graphics.clear();
      this.pool.push(graphics);
    }
  }

  releaseAll(): void {
    this.active.forEach(graphics => {
      graphics.clear();
      this.pool.push(graphics);
    });
    this.active.clear();
  }
}