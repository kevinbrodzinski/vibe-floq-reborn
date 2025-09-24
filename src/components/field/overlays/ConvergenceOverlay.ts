import * as PIXI from 'pixi.js';
import type { ConvergenceEvent } from '@/types/field';
import { PHASE2, FIELD_LOD, ATMO } from '@/lib/field/constants';
import { atmoTokens, visualTokens } from '@/lib/vibe/tokens';

export class ConvergenceOverlay {
  private container: PIXI.Container;
  private pool: PIXI.Sprite[] = [];
  private active = new Map<string, { s: PIXI.Sprite; t: number; created: number; baseAlpha: number }>();
  private convergenceTint: number;

  constructor(parent: PIXI.Container, cap = 256) {
    this.container = new PIXI.Container();
    parent.addChild(this.container);
    
    // Token-first convergence color
    this.convergenceTint = parseInt(atmoTokens.convergencePrimary.slice(1), 16);
    
    // Pre-create sprite pool
    for (let i = 0; i < cap; i++) {
      this.pool.push(new PIXI.Sprite(PIXI.Texture.WHITE));
    }
  }

  render(events: ConvergenceEvent[], zoom: number) {
    // Early LOD gate - don't show anything below minimum zoom
    if (zoom < ATMO.BREATHING.MIN_ZOOM) return;
    
    const S = PHASE2.CONVERGENCE;
    const now = performance.now();
    
    // Update existing convergence markers with smooth fade
    for (const [id, rec] of this.active) {
      const age = now - rec.created;
      const k = Math.max(0, 1 - age / ATMO.CONVERGENCE.COOL_MS);
      rec.s.alpha = rec.baseAlpha * k;
      
      if (k === 0) {
        // Fade complete - recycle by hiding, not removing (performance)
        rec.s.visible = false;
        this.active.delete(id);
      }
    }

    // Process new events up to frame budget
    let processed = 0;
    for (const e of events) {
      if (processed >= ATMO.CONVERGENCE.MAX_PER_FRAME) break;
      
      // Privacy gate: only show convergences with sufficient confidence 
      if (!e.confidence || e.confidence < 0.3) continue;
      
      // Reuse existing sprite or create new one
      let rec = this.active.get(e.id);
      if (!rec) {
        rec = this.add(e.id);
        if (!rec) continue; // Pool exhausted
      }
      
      const s = rec.s;
      s.position.set(e.meeting.x, e.meeting.y);
      s.width = visualTokens.atmo.convergenceMarkerSize; 
      s.height = visualTokens.atmo.convergenceMarkerSize;
      
      // Calculate base alpha and apply fade
      const baseAlpha = Math.min(0.85, 0.4 + 0.6 * e.confidence);
      const age = now - rec.created;
      const k = Math.max(0, 1 - age / ATMO.CONVERGENCE.COOL_MS);
      s.alpha = baseAlpha * k;
      
      // Use token-first convergence color
      s.tint = this.convergenceTint;
      
      rec.baseAlpha = baseAlpha;
      rec.t = now;
      processed++;
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
    const rec = { 
      s, 
      t: performance.now(), 
      created: performance.now(),
      baseAlpha: 0.85 
    };
    this.active.set(id, rec);
    return rec;
  }


  clear() {
    // No hot-path removeChild - just mark invisible for performance
    for (const [id, rec] of this.active) {
      rec.s.visible = false;
    }
    this.active.clear();
  }

  destroy() {
    this.clear();
    this.container.destroy({ children: true });
  }
}