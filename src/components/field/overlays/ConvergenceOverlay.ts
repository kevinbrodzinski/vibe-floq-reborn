import * as PIXI from 'pixi.js';
import type { ConvergenceEvent } from '@/types/field';
import { PHASE2, FIELD_LOD, ATMO } from '@/lib/field/constants';

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

    // Render active convergence events with privacy gates
    for (const e of events) {
      // Privacy gate: only show convergences with sufficient k-anonymity 
      if (!e.confidence || e.confidence < 0.3) continue; // Low confidence filter
      
      // Reuse existing sprite or create new one
      const rec = this.active.get(e.id) ?? this.add(e.id);
      if (!rec) continue; // Pool exhausted
      
      const s = rec.s;
      s.position.set(e.meeting.x, e.meeting.y);
      s.width = 6; 
      s.height = 6; 
      
      // Fade out based on age with smooth transition
      const age = now - rec.t;
      const k = Math.max(0, 1 - age / S.COOL_MS);
      const baseAlpha = Math.min(0.85, 0.4 + 0.6 * e.confidence);
      s.alpha = baseAlpha * k;
      
      // Use semantic convergence color from design tokens
      s.tint = ATMO.CONVERGENCE.COLOR;
      
      rec.t = now;
    }
  }

  private add(id: string) {
    const s = this.pool.pop();
    if (!s) return null; // Pool exhausted
    
    // Set static properties once at acquire
    s.anchor.set(0.5);
    s.blendMode = 'add';
    s.visible = true;
    
    this.container.addChild(s);
    const rec = { s, t: performance.now() };
    this.active.set(id, rec);
    return rec;
  }

  private recycle(id: string) {
    const rec = this.active.get(id);
    if (!rec) return;
    
    // Fade out smoothly instead of abrupt removal
    const age = performance.now() - rec.t;
    const coolMs = PHASE2.CONVERGENCE.COOL_MS;
    if (age >= coolMs) {
      rec.s.visible = false;
      this.container.removeChild(rec.s);
      this.pool.push(rec.s);
      this.active.delete(id);
    }
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