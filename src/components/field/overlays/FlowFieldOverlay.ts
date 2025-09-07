import * as PIXI from 'pixi.js';
import { FIELD_LOD, P3 } from '@/lib/field/constants';
import { flowTokens } from '@/lib/field/visualTokens';
import { ADD_BLEND } from '@/lib/pixi/blendModes';
import type { FlowCell } from '@/lib/field/types';

export class FlowFieldOverlay {
  private container: PIXI.ParticleContainer;
  private sprites: PIXI.Sprite[] = [];
  private capacity: number = P3.FLOW.MAX_ARROWS;

  constructor(parent: PIXI.Container, capacity?: number) {
    this.capacity = capacity || P3.FLOW.MAX_ARROWS;
    this.container = new (PIXI as any).ParticleContainer(this.capacity, {
      position: true, rotation: true, alpha: true, scale: true, tint: true
    });
    parent.addChild(this.container);
    
    // Prewarm sprites
    for (let i = 0; i < this.capacity; i++) {
      const s = new PIXI.Sprite(PIXI.Texture.WHITE);
      s.anchor.set(0.5, 0.5);
      s.blendMode = ADD_BLEND;
      s.visible = false;
      this.sprites.push(s);
      this.container.addChild(s);
    }
  }

  // Allow dynamic capacity adjustment for device tiers
  setCapacity(capacity: number) {
    this.capacity = Math.min(capacity, P3.FLOW.MAX_ARROWS);
  }

  update(cells: FlowCell[], zoom: number) {
    // LOD gate
    if (zoom < P3.FLOW.MIN_ZOOM) { 
      this.hideAll(); 
      return; 
    }
    
    // Sort by magnitude, render top-K with capacity limit
    const sorted = cells.slice().sort((a, b) => b.mag - a.mag).slice(0, this.capacity);
    const toHex = (hex: string) => parseInt(hex.slice(1), 16);

    for (let i = 0; i < this.sprites.length; i++) {
      const s = this.sprites[i];
      const c = sorted[i];
      if (!c) { 
        s.visible = false; 
        continue; 
      }

      const angle = Math.atan2(c.vy, c.vx);
      const len = flowTokens.arrow.lengthPx * Math.max(0.5, Math.min(1.6, c.mag));
      s.position.set(c.x, c.y);
      s.rotation = angle;
      s.width = len; 
      s.height = flowTokens.arrow.widthPx;
      s.alpha = flowTokens.arrow.alpha;

      // Magnitude → tint band
      const tint = c.mag > 1.2 ? flowTokens.color.high
                  : c.mag > 0.7 ? flowTokens.color.mid
                                 : flowTokens.color.low;
      s.tint = toHex(tint);
      s.visible = true;
    }
  }

  tick(_deltaMS: number) {
    // Optional subtle alpha oscillation if desired
  }

  private hideAll() {
    for (const s of this.sprites) s.visible = false;
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}