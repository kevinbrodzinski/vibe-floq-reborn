import * as PIXI from 'pixi.js';
import { OverlayBase } from '@/features/field/overlays/OverlayBase';

export class FogOverlay extends OverlayBase {
  private rect = new PIXI.Graphics();
  private target = 0;

  constructor(parent: PIXI.Container) {
    super(new PIXI.Container());
    this.container.addChild(this.rect);
    parent.addChild(this.container);
  }

  setLevel(a: number) { 
    this.target = Math.max(0, Math.min(0.6, a)); 
  }

  resize(w: number, h: number) {
    this.rect.clear();
    this.rect.rect(0, 0, w, h).fill({ color: 0x101217, alpha: 1 }); // deep slate tint
  }

  update(deltaMS: number) {
    if (this.shouldSkipRender()) return;
    
    const step = Math.max(0.5, Math.min(2, deltaMS / 16)) * 0.04;
    this.alpha += Math.sign(this.target - this.alpha) * step;
    this.alpha = Math.max(0, Math.min(1, this.alpha));
    this.container.alpha = this.alpha;
  }
}