import * as PIXI from 'pixi.js';
import { FIELD_LOD, P3 } from '@/lib/field/constants';
import { momentumTokens } from '@/lib/field/visualTokens';
import type { MomentumStat } from '@/lib/field/types';

export class MomentumBadge {
  private container: PIXI.ParticleContainer;
  private map = new Map<string, PIXI.Sprite>();

  constructor(parent: PIXI.Container) {
    this.container = new (PIXI as any).ParticleContainer(256, { 
      position: true, rotation: true, alpha: true, tint: true 
    });
    parent.addChild(this.container);
  }

  update(
    stats: MomentumStat[], 
    zoom: number, 
    kById: Map<string, number>, 
    xyById: Map<string, { x: number; y: number }>
  ) {
    if (zoom < P3.MOMENTUM.MIN_ZOOM) { 
      this.clear(); 
      return; 
    }

    const keep = new Set<string>();
    const toHex = (hex: string) => parseInt(hex.slice(1), 16);
    
    for (const m of stats) {
      const k = kById.get(m.id) ?? 0;
      if (k < FIELD_LOD.K_MIN || m.speed < P3.MOMENTUM.SPEED_MIN) continue;
      const xy = xyById.get(m.id);
      if (!xy) continue;

      let s = this.map.get(m.id);
      if (!s) {
        s = new PIXI.Sprite(PIXI.Texture.WHITE);
        s.anchor.set(0.5);
        s.width = momentumTokens.badgeSize;
        s.height = momentumTokens.strokeWidth;
        s.alpha = momentumTokens.alpha;
        s.tint = toHex(momentumTokens.color);
        s.blendMode = 'add';
        this.map.set(m.id, s);
        this.container.addChild(s);
      }
      s.position.set(xy.x, xy.y);
      s.rotation = m.heading;
      keep.add(m.id);
    }
    
    // Prune
    for (const [id, s] of this.map) {
      if (!keep.has(id)) {
        this.container.removeChild(s);
        s.destroy();
        this.map.delete(id);
      }
    }
  }

  clear() {
    for (const [, s] of this.map) {
      this.container.removeChild(s);
      s.destroy();
    }
    this.map.clear();
  }

  destroy() {
    this.clear();
    this.container.destroy();
  }
}