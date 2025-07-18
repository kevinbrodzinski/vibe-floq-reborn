import * as PIXI from 'pixi.js';

// Simple ripple effect using PIXI's built-in capabilities
export class RippleEffect {
  public sprite: PIXI.Sprite;
  public startTime: number;
  public maxSize: number;
  private _destroyed = false;
  
  constructor(x: number, y: number, size: number, color = 0xffffff) {
    this.sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.sprite.anchor.set(0.5);
    this.sprite.position.set(x, y);
    this.sprite.width = this.sprite.height = size * 0.5;
    this.sprite.alpha = 0.8;
    this.sprite.tint = color;
    this.maxSize = size * 4;
    this.startTime = performance.now();
  }

  update(): boolean {
    const elapsed = (performance.now() - this.startTime) / 1000;
    const progress = elapsed / 1.5; // 1.5 second duration
    
    if (progress >= 1) {
      return false; // Animation complete
    }
    
    // Expand and fade
    const scale = 0.5 + (progress * 3.5);
    this.sprite.width = this.sprite.height = this.maxSize * scale;
    this.sprite.alpha = 0.8 * (1 - progress);
    
    return true;
  }

  destroy() {
    if (this._destroyed) return;        // bail on 2nd call
    this._destroyed = true;

    this.sprite?.destroy();             // optional chain in case it's already null
  }
}