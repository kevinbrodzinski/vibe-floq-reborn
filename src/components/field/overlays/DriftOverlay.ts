import * as PIXI from 'pixi.js';
import { OverlayBase } from '@/features/field/overlays/OverlayBase';

type Drift = { s: PIXI.Sprite; x: number; y: number; vx: number; vy: number };

export class DriftOverlay extends OverlayBase {
  private pc: PIXI.ParticleContainer;
  private sprites: Drift[] = [];
  private tier: 'low' | 'mid' | 'high' = 'high';

  constructor(parent: PIXI.Container, capacity = 120) {
    super(new PIXI.Container());
    this.pc = new (PIXI as any).ParticleContainer(capacity, { 
      position: true, 
      alpha: true, 
      tint: true, 
      scale: true 
    });
    this.container.addChild(this.pc);
    parent.addChild(this.container);

    for (let i = 0; i < capacity; i++) {
      const s = new PIXI.Sprite(PIXI.Texture.WHITE);
      s.visible = false; 
      s.anchor.set(0.5); 
      s.alpha = 0.08; 
      s.width = 2; 
      s.height = 2;
      this.pc.addChild(s);
      this.sprites.push({ s, x: 0, y: 0, vx: 0, vy: 0 });
    }
  }

  setQuality(q: { tier: 'low' | 'mid' | 'high' }) { 
    this.tier = q.tier; 
  }

  resetField(width: number, height: number) {
    for (const d of this.sprites) {
      d.x = Math.random() * width; 
      d.y = Math.random() * height; 
      d.s.tint = 0x99aabb;
      d.s.visible = this.tier !== 'low' && Math.random() < (this.tier === 'mid' ? 0.5 : 1);
      d.s.position.set(d.x, d.y);
    }
  }

  update(deltaMS: number, flowCells: Array<{ x: number; y: number; vx: number; vy: number }>, width: number, height: number) {
    if (this.shouldSkipRender() || this.tier === 'low') return;
    
    const dt = Math.max(16, deltaMS);
    for (const d of this.sprites) {
      if (!d.s.visible) continue;
      
      // sample nearest flow cell (cheap)
      let best = 0, bi = -1;
      for (let i = 0; i < flowCells.length && i < 48; i++) { // sample budget
        const c = flowCells[i]; 
        const dx = c.x - d.x, dy = c.y - d.y; 
        const m = dx * dx + dy * dy;
        if (bi < 0 || m < best) { 
          best = m; 
          bi = i;
        }
      }
      
      if (bi >= 0) {
        const c = flowCells[bi];
        d.vx = d.vx * 0.9 + c.vx * 0.1; 
        d.vy = d.vy * 0.9 + c.vy * 0.1;
      }
      
      d.x += d.vx * dt; 
      d.y += d.vy * dt;
      
      // wrap edges
      if (d.x < 0) d.x += width; 
      else if (d.x > width) d.x -= width;
      if (d.y < 0) d.y += height; 
      else if (d.y > height) d.y -= height;
      
      d.s.position.set(d.x, d.y);
    }
  }
}