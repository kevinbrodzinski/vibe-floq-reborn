import * as PIXI from 'pixi.js';

export class TileSpritePool {
  private pool: PIXI.Sprite[] = [];
  public active = new Map<string, PIXI.Sprite>(); // key = tile_id
  constructor(private texture: PIXI.Texture, private max = 400) {}

  acquire(id: string): PIXI.Sprite {
    if (this.active.has(id)) return this.active.get(id)!;
    const sprite = this.pool.pop() ?? new PIXI.Sprite(this.texture);
    sprite.alpha = 0;                    // start invisible
    this.active.set(id, sprite);
    return sprite;
  }

  release(id: string): void {
    const sprite = this.active.get(id);
    if (!sprite) return;
    this.active.delete(id);
    if (this.pool.length < this.max) {
      sprite.visible = false;
      this.pool.push(sprite);
    } else {
      sprite.destroy();
    }
  }

  clearAll() {
    Array.from(this.active.keys()).forEach(id => this.release(id));
  }
}