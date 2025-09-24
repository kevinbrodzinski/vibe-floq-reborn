/**
 * Base class for overlays with alpha short-circuit optimization
 */
import * as PIXI from 'pixi.js';

export abstract class OverlayBase {
  protected container: PIXI.Container;
  protected alpha = 1;

  constructor(container: PIXI.Container) {
    this.container = container;
  }

  setAlpha(alpha: number) {
    this.alpha = alpha;
    this.container.alpha = alpha;
  }

  /**
   * Override in subclasses - should check alpha and return early if < 0.05
   */
  abstract update(deltaMS: number, ...args: any[]): void;

  /**
   * Alpha short-circuit helper for overlays
   */
  protected shouldSkipRender(): boolean {
    return this.container.alpha < 0.05;
  }

  /**
   * Cleanup method - override in subclasses
   */
  destroy() {
    // Clear pools, textures, remove children
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }
}