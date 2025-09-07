import * as PIXI from 'pixi.js';
import { windTokens } from '@/lib/field/visualTokens';
import type { WindPath } from '@/lib/field/types';
import { P4 } from '@/lib/field/constants';

export class TradeWindOverlay {
  private container: PIXI.ParticleContainer;
  private arrows: PIXI.Sprite[] = [];
  private capacity: number;

  constructor(parent: PIXI.Container, capacity = P4.WINDS.MAX_PATHS * 20) {
    this.capacity = capacity;
    this.container = new (PIXI as any).ParticleContainer(capacity, {
      position:true, rotation:true, alpha:true, scale:true, tint:true
    });
    parent.addChild(this.container);
    
    // Pre-warm sprite pool
    for (let i = 0; i < capacity; i++) {
      const s = new PIXI.Sprite(PIXI.Texture.WHITE);
      s.anchor.set(0.5); 
      s.visible = false; 
      s.blendMode = (PIXI as any).BLEND_MODES?.ADD ?? ('add' as any);
      this.arrows.push(s); 
      this.container.addChild(s);
    }
  }

  setCapacity(n: number) { 
    this.capacity = Math.max(0, Math.min(n * 20, this.arrows.length)); 
  }

  update(paths: WindPath[], zoom: number): number {
    if (zoom < P4.WINDS.MIN_ZOOM) { 
      for (const s of this.arrows) s.visible = false; 
      return 0; 
    }
    
    // Sample each path into oriented "arrow" sprites at stride K
    let idx = 0;
    const toHex = (h: string) => parseInt(h.slice(1), 16);

    for (const p of paths.slice(0, P4.WINDS.MAX_PATHS)) {
      const stride = Math.max(6, Math.floor(p.pts.length / 20));
      for (let i = 0; i < p.pts.length && idx < this.capacity; i += stride) {
        const a = p.pts[i];
        const b = p.pts[Math.min(i + 1, p.pts.length - 1)];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const angle = Math.atan2(dy, dx);
        const s = this.arrows[idx++];

        s.position.set(a.x, a.y);
        s.rotation = angle;
        s.width = windTokens.arrowLenPx * (0.8 + 0.6 * p.strength);
        s.height = windTokens.widthPx;
        s.alpha = windTokens.alpha * (0.6 + 0.4 * p.support);
        
        const tint = p.strength > 0.66 ? windTokens.colorHigh
                   : p.strength > 0.33 ? windTokens.colorMid
                   : windTokens.colorLow;
        s.tint = toHex(tint);
        s.visible = true;
      }
    }
    
    // Hide remainder
    for (; idx < this.arrows.length; idx++) {
      this.arrows[idx].visible = false;
    }
    
    return idx; // return visible arrows count for HUD
  }

  tick(_deltaMS: number) { 
    // Optional: sinusoidal alpha wiggle using windTokens.dashHz 
  }
  
  destroy() { 
    this.container.destroy({ children: true }); 
  }
}