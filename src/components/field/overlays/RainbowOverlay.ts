import * as PIXI from 'pixi.js';
import { OverlayBase } from '@/features/field/overlays/OverlayBase';

const ADD = 'add' as any;

type Arc = { g: PIXI.Graphics; born: number; ttl: number; x: number; y: number; r: number };

export class RainbowOverlay extends OverlayBase {
  private arcs: Arc[] = [];
  private pool: PIXI.Graphics[] = [];

  constructor(parent: PIXI.Container) {
    super(new PIXI.Container());
    parent.addChild(this.container);
  }

  spawn(x: number, y: number, intensity: number) {
    const g = this.pool.pop() ?? new PIXI.Graphics();
    g.blendMode = ADD; 
    this.container.addChild(g);
    const r = 80 + 80 * intensity;
    this.arcs.push({ g, born: performance.now(), ttl: 1800, x, y, r });
  }

  update() {
    if (this.shouldSkipRender()) return;
    
    const now = performance.now();
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const a = this.arcs[i]; 
      const t = (now - a.born) / a.ttl; 
      if (t >= 1) { 
        this.recycle(i); 
        continue; 
      }
      
      const alpha = 0.18 * (1 - t);
      const g = a.g; 
      g.clear(); 
      g.position.set(a.x, a.y);
      
      // multi-hue soft arc
      const colors = [0xff6b6b, 0xffd166, 0x06d6a0, 0x118ab2, 0x9b5de5];
      colors.forEach((c, idx) => {
        g.arc(0, 0, a.r + idx * 4, Math.PI * 1.15, Math.PI * 1.85)
         .stroke({ width: 2, color: c, alpha });
      });
    }
  }

  private recycle(i: number) {
    const a = this.arcs[i]; 
    if (a.g.parent) this.container.removeChild(a.g);
    a.g.clear(); 
    this.pool.push(a.g); 
    this.arcs.splice(i, 1);
  }
}