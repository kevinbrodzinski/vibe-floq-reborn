/**
 * Lightning Overlay - Momentary convergence flashes
 * Triggers when convergence lanes have high confidence and short ETA
 */

import * as PIXI from 'pixi.js';
import type { ConvergenceEvent } from '@/types/field';
import { ADD_BLEND } from '@/lib/pixi/blendModes';

interface LightningBolt {
  id: string;
  segments: { x: number; y: number }[];
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
  color: number;
  width: number;
}

export class LightningOverlay {
  private container: PIXI.Container;
  private bolts: LightningBolt[] = [];
  private graphics: PIXI.Graphics;
  private maxBolts = 8;
  private maxPerFrame = 2;
  
  constructor(parent: PIXI.Container) {
    this.container = new PIXI.Container();
    this.container.label = 'Lightning';
    
    this.graphics = new PIXI.Graphics();
    this.graphics.blendMode = ADD_BLEND;
    this.container.addChild(this.graphics);
    
    parent.addChild(this.container);
  }

  /**
   * Update lightning system with convergence data
   */
  update(convergences: ConvergenceEvent[], deltaMS: number, zoom: number) {
    const dt = deltaMS / 1000;
    
    // Trigger lightning for high-confidence, short-ETA convergences
    this.triggerLightning(convergences, zoom);
    
    // Update existing bolts
    this.updateBolts(dt);
    
    // Render all bolts
    this.render();
  }

  private triggerLightning(convergences: ConvergenceEvent[], zoom: number) {
    if (this.bolts.length >= this.maxBolts) return;
    
    let triggered = 0;
    
    for (const conv of convergences) {
      if (triggered >= this.maxPerFrame) break;
      
      // Lightning conditions: high confidence, short ETA, close approach
      if (conv.confidence >= 0.6 && 
          conv.etaMs < 60_000 && 
          conv.dStar < 100) {
        
        // Don't retrigger same convergence
        if (this.bolts.some(b => b.id === conv.id)) continue;
        
        const bolt = this.createBolt(conv, zoom);
        this.bolts.push(bolt);
        triggered++;
      }
    }
  }

  private createBolt(convergence: ConvergenceEvent, zoom: number): LightningBolt {
    const segments = this.generateBoltPath(convergence);
    
    // Lightning intensity based on convergence confidence
    const maxAlpha = 0.7 + (convergence.confidence - 0.6) * 0.3;
    const lifeMs = 600 + Math.random() * 400; // 600-1000ms
    
    // Color based on confidence (blue to white)
    const intensity = Math.min(1, convergence.confidence / 0.8);
    const color = this.interpolateColor(0x4488ff, 0xffffff, intensity);
    
    return {
      id: convergence.id,
      segments,
      alpha: 0,
      maxAlpha,
      life: lifeMs / 1000,
      maxLife: lifeMs / 1000,
      color,
      width: 2 + Math.random() * 2
    };
  }

  private generateBoltPath(convergence: ConvergenceEvent): { x: number; y: number }[] {
    const start = { x: convergence.meeting.x - 50, y: convergence.meeting.y - 50 };
    const end = { x: convergence.meeting.x + 50, y: convergence.meeting.y + 50 };
    
    const segments = [start];
    
    // Generate 2-3 jagged segments
    const numSegments = 2 + Math.floor(Math.random() * 2);
    
    for (let i = 1; i < numSegments; i++) {
      const t = i / numSegments;
      const baseX = start.x + (end.x - start.x) * t;
      const baseY = start.y + (end.y - start.y) * t;
      
      // Add random jitter
      const jitterX = (Math.random() - 0.5) * 60;
      const jitterY = (Math.random() - 0.5) * 60;
      
      segments.push({
        x: baseX + jitterX,
        y: baseY + jitterY
      });
    }
    
    segments.push(end);
    return segments;
  }

  private updateBolts(dt: number) {
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bolt = this.bolts[i];
      
      bolt.life -= dt;
      
      if (bolt.life <= 0) {
        this.bolts.splice(i, 1);
        continue;
      }
      
      // Fade in quickly, then fade out
      const lifeRatio = bolt.life / bolt.maxLife;
      if (lifeRatio > 0.8) {
        // Fade in phase (first 20% of life)
        const fadeIn = (1 - lifeRatio) / 0.2;
        bolt.alpha = bolt.maxAlpha * fadeIn;
      } else {
        // Fade out phase (remaining 80% of life)
        bolt.alpha = bolt.maxAlpha * (lifeRatio / 0.8);
      }
    }
  }

  private render() {
    this.graphics.clear();
    
    for (const bolt of this.bolts) {
      if (bolt.alpha <= 0) continue;
      
      this.graphics.stroke({
        color: bolt.color,
        alpha: bolt.alpha,
        width: bolt.width
      });
      
      // Draw jagged lightning path
      if (bolt.segments.length > 1) {
        this.graphics.moveTo(bolt.segments[0].x, bolt.segments[0].y);
        
        for (let i = 1; i < bolt.segments.length; i++) {
          this.graphics.lineTo(bolt.segments[i].x, bolt.segments[i].y);
        }
      }
    }
  }

  private interpolateColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;
    
    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return (r << 16) | (g << 8) | b;
  }

  /**
   * Set visibility alpha from AltitudeController
   */
  setAlpha(alpha: number) {
    this.container.alpha = alpha;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.bolts.length = 0;
    this.graphics.clear();
    this.container.destroy({ children: true });
  }
}