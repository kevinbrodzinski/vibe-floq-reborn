import * as PIXI from 'pixi.js';
import { atmoTintTokens } from '@/lib/field/visualTokens';

type Bucket = keyof typeof atmoTintTokens;

export class AtmoTintOverlay {
  private rect: PIXI.Graphics;
  private bucket: Bucket | null = null;

  constructor(parent: PIXI.Container, private renderer: PIXI.Renderer) {
    this.rect = new PIXI.Graphics(); 
    parent.addChild(this.rect);
  }

  update(now: Date) {
    const b = this.bucketFor(now);
    if (b === this.bucket) return;
    this.bucket = b;

    const { width, height } = this.renderer;
    const cfg = atmoTintTokens[b];
    
    // Simple two-stop vertical gradient emulated with two filled rects and alpha mix
    this.rect.clear();
    this.rect.rect(0, 0, width, height / 2)
             .fill({ color: parseInt(cfg.top.slice(1), 16), alpha: cfg.alpha });
    this.rect.rect(0, height / 2, width, height / 2)
             .fill({ color: parseInt(cfg.bottom.slice(1), 16), alpha: cfg.alpha });
    
    (this.rect as any).blendMode = 'multiply' as any;
  }

  private bucketFor(now: Date): Bucket {
    const h = now.getHours() + now.getMinutes() / 60;
    if (h < 6)  return 'night';
    if (h < 9)  return 'dawn';
    if (h < 12) return 'morning';
    if (h < 17) return 'noon';
    if (h < 20) return 'dusk';
    return 'night';
  }

  destroy() { 
    this.rect.destroy(); 
  }
}