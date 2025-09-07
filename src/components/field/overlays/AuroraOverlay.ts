import * as PIXI from 'pixi.js';
import { auroraTokens } from '@/lib/field/visualTokens';
import type { AuroraEventLite } from '@/lib/field/types';
import { P4 } from '@/lib/field/constants';

export class AuroraOverlay {
  private container: PIXI.Container;
  private rings: PIXI.Graphics[] = [];
  private max = P4.AURORA.MAX_CONCURRENT;

  constructor(parent: PIXI.Container) {
    this.container = new PIXI.Container(); 
    parent.addChild(this.container);
  }

  update(events: AuroraEventLite[], zoom: number) {
    if (zoom < P4.AURORA.MIN_ZOOM) { 
      this.clear(); 
      return; 
    }
    
    const list = events.slice(0, this.max);
    
    // Grow ring pool as needed
    while (this.rings.length < list.length) {
      const g = new PIXI.Graphics(); 
      g.blendMode = (PIXI as any).BLEND_MODES?.ADD ?? ('add' as any);
      this.rings.push(g); 
      this.container.addChild(g);
    }
    
    // Draw aurora rings
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const g = this.rings[i]; 
      g.clear();
      
      const col = parseInt(auroraTokens.colors[i % auroraTokens.colors.length].slice(1), 16);
      const alpha = auroraTokens.alpha * e.intensity;
      const r = Math.min(auroraTokens.maxRadiusPx, e.radiusPx);
      
      // Outer ring
      g.circle(e.center.x, e.center.y, r).stroke({ width: 2, color: col, alpha });
      
      // Inner glow
      g.circle(e.center.x, e.center.y, Math.max(8, r * 0.4))
       .fill({ color: col, alpha: alpha * 0.25 });
      
      g.alpha = alpha;
    }
    
    // Hide extras
    for (let i = list.length; i < this.rings.length; i++) { 
      this.rings[i].clear(); 
    }
  }

  clear() { 
    for (const g of this.rings) g.clear(); 
  }
  
  destroy() { 
    this.clear(); 
    this.container.destroy(); 
  }
}