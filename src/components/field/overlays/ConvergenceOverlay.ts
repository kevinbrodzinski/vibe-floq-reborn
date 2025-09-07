import * as PIXI from 'pixi.js';
import type { ConvergenceEvent } from '@/types/field';
import { PHASE2 } from '@/lib/field/constants';

export class ConvergenceOverlay {
  private container: PIXI.Container;
  private pool: PIXI.Sprite[] = [];
  private active = new Map<string, { s: PIXI.Sprite; t: number }>();

  constructor(parent: PIXI.Container, cap = 256) {
    this.container = new PIXI.Container();
    parent.addChild(this.container);
    
    // Pre-create sprite pool
    for (let i = 0; i < cap; i++) {
      this.pool.push(new PIXI.Sprite(PIXI.Texture.WHITE));
    }
  }

  render(events: ConvergenceEvent[], zoom: number) {
    const S = PHASE2.CONVERGENCE;
    const now = performance.now();
    
    // Remove expired convergence markers
    for (const [id, rec] of this.active) {
      if (now - rec.t > S.COOL_MS) {
        this.recycle(id);
      }
    }

    // LOD gate - don't show anything below minimum zoom
    if (zoom < S.ZOOM_MIN) return;

    // Render active convergence events
    for (const e of events) {
      // Reuse existing sprite or create new one
      const rec = this.active.get(e.id) ?? this.add(e.id);
      if (!rec) continue; // Pool exhausted
      
      const s = rec.s;
      s.position.set(e.meeting.x, e.meeting.y);
      s.width = 6; 
      s.height = 6; 
      s.anchor.set(0.5);
      s.alpha = Math.min(0.85, 0.4 + 0.6 * e.confidence);
      
      // Use amber/social color for convergence points
      s.tint = 0xf59e0b; // amber-500 equivalent
      
      rec.t = now;
    }
  }

  private add(id: string) {
    const s = this.pool.pop();
    if (!s) return null; // Pool exhausted
    
    this.container.addChild(s);
    const rec = { s, t: performance.now() };
    this.active.set(id, rec);
    return rec;
  }

  private recycle(id: string) {
    const rec = this.active.get(id);
    if (!rec) return;
    
    this.container.removeChild(rec.s);
    this.pool.push(rec.s);
    this.active.delete(id);
  }

  clear() {
    for (const id of this.active.keys()) {
      this.recycle(id);
    }
  }

  destroy() {
    this.clear();
    this.container.destroy({ children: true });
  }
}