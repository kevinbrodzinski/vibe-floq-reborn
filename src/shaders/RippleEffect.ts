import * as PIXI from 'pixi.js';

/**
 * A lightweight sprite-based ripple: expands + fades over 1.5 s.
 * Keeps all logic in JS so it works on devices without custom-filter support.
 */
export default class RippleEffect {
  sprite: PIXI.Sprite;
  private startTime = performance.now();
  private readonly duration = 1500; // ms
  private readonly maxSize: number;
  private _destroyed = false;

  constructor(x: number, y: number, baseRadius: number, color = 0xffffff) {
    this.sprite = PIXI.Sprite.from(PIXI.Texture.WHITE);
    this.sprite.position.set(x, y);
    this.sprite.anchor.set(0.5);
    this.sprite.alpha = 0.8;
    this.sprite.tint = color;

    this.maxSize = baseRadius * 4;
    this.sprite.width = this.sprite.height = baseRadius * 0.5;
  }

  /** Returns `false` when the animation is finished (ready to destroy). */
  update(): boolean {
    const elapsed = performance.now() - this.startTime;
    const progress = elapsed / this.duration;
    if (progress >= 1) return false;

    // exponential-ish ease-out
    const scale = 0.5 + progress * 3.5;
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