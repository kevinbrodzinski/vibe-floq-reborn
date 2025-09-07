import * as PIXI from 'pixi.js';
import { P3B } from '@/lib/field/constants';
import { pressureTokens } from '@/lib/field/visualTokens';
import { ADD_BLEND } from '@/lib/pixi/blendModes';
import { safeAngle } from '@/lib/math/safety';
import { generateTexture } from '@/lib/pixi/textureHelpers';
import type { PressureCell } from '@/lib/field/types';

export class PressureOverlay {
  private container: PIXI.ParticleContainer;
  private sprites: PIXI.Sprite[] = [];
  private circle: PIXI.Texture;
  private capacity: number = P3B.PRESSURE.MAX_CELLS;

  constructor(parent: PIXI.Container, renderer: PIXI.Renderer, capacity = P3B.PRESSURE.MAX_CELLS) {
    if (!renderer) throw new Error('Renderer not ready for PressureOverlay');
    this.capacity = capacity;
    this.container = new (PIXI as any).ParticleContainer(this.capacity, {
      position: true, rotation: true, alpha: true, tint: true, scale: true
    });
    parent.addChild(this.container);

    // RN-safe soft circle texture
    const g = new PIXI.Graphics();
    g.clear();
    g.circle(0, 0, 64).fill({ color: 0xffffff, alpha: 0.06 });
    g.circle(0, 0, 42).fill({ color: 0xffffff, alpha: 0.18 });
    g.circle(0, 0, 24).fill({ color: 0xffffff, alpha: 0.45 });
    this.circle = generateTexture(renderer, g);
    g.destroy();

    for (let i = 0; i < this.capacity; i++) {
      const s = new PIXI.Sprite(this.circle);
      s.anchor.set(0.5);
      s.visible = false;
      s.blendMode = ADD_BLEND;
      this.sprites.push(s);
      this.container.addChild(s);
    }
  }

  // Allow dynamic capacity adjustment for device tiers
  setCapacity(capacity: number) {
    this.capacity = Math.min(capacity, P3B.PRESSURE.MAX_CELLS);
  }

  update(cells: PressureCell[], zoom: number) {
    if (zoom < P3B.PRESSURE.MIN_ZOOM || cells.length === 0) {
      for (const s of this.sprites) s.visible = false;
      return;
    }

    // normalize pressure to [0..1] per frame using top-k
    const top = Math.max(0.0001, cells[0]?.p ?? 0.0001);
    const toHex = (hex: string) => parseInt(hex.slice(1), 16);

    for (let i = 0; i < this.sprites.length; i++) {
      const s = this.sprites[i];
      const c = cells[i];
      if (!c) { 
        s.visible = false; 
        continue; 
      }

      // alpha & scale by normalized pressure
      const norm = Math.max(0, Math.min(1, c.p / top));
      const r = pressureTokens.cellRadiusPx * (1 + norm * pressureTokens.glowBoost);
      s.position.set(c.x, c.y);
      s.scale.set(r / 64);

      // orient a hint toward wind = -∇p (use gradient angle)
      const angle = safeAngle(Math.atan2(-c.gy, -c.gx));
      s.rotation = angle;

      // tint by intensity band
      const tint = norm > 0.66 ? pressureTokens.color.high
                  : norm > 0.33 ? pressureTokens.color.mid
                                 : pressureTokens.color.low;
      s.tint = toHex(tint);
      s.alpha = pressureTokens.alpha * (0.6 + 0.4 * norm);
      s.visible = true;
    }
  }

  refreshTextures(renderer: PIXI.Renderer) {
    // Re-create texture for DPR/renderer changes
    const g = new PIXI.Graphics();
    g.clear();
    g.circle(0, 0, 64).fill({ color: 0xffffff, alpha: 0.06 });
    g.circle(0, 0, 42).fill({ color: 0xffffff, alpha: 0.18 });
    g.circle(0, 0, 24).fill({ color: 0xffffff, alpha: 0.45 });
    this.circle = generateTexture(renderer, g);
    g.destroy();
    
    // Update all sprites with new texture
    for (const sprite of this.sprites) {
      sprite.texture = this.circle;
    }
  }

  destroy() { 
    this.container.destroy({ children: true }); 
  }
}