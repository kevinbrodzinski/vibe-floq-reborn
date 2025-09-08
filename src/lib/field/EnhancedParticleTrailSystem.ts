import * as PIXI from 'pixi.js';
import { AfterglowTrailManager } from './physics/AfterglowTrailManager';
import type { EnhancedFieldTile } from '../../../packages/types/domain/enhanced-field';

/**
 * Enhanced particle trail system integrating with social physics
 * Uses the patent-compliant AfterglowTrailManager for trail generation
 */
export class EnhancedParticleTrailSystem {
  private container: PIXI.Container;
  private trailContainer: PIXI.Container;
  private glowContainer: PIXI.Container;
  private activeTrails = new Map<string, PIXI.Graphics>();
  private activeGlowTrails = new Map<string, PIXI.Graphics>();
  private blurFilter: PIXI.BlurFilter;

  constructor(parentContainer: PIXI.Container) {
    this.container = new PIXI.Container();
    this.container.label = 'EnhancedParticleTrails';
    
    // Separate containers for layering
    this.glowContainer = new PIXI.Container();
    this.glowContainer.label = 'TrailGlow';
    this.trailContainer = new PIXI.Container();
    this.trailContainer.label = 'TrailLines';
    
    // Apply glow effect
    this.blurFilter = new PIXI.BlurFilter();
    this.blurFilter.blur = 4;
    this.glowContainer.filters = [this.blurFilter];
    
    this.container.addChild(this.glowContainer);
    this.container.addChild(this.trailContainer);
    parentContainer.addChild(this.container);
  }

  /**
   * Update trails for enhanced field tiles using physics-based trail management
   */
  updateTrails(
    tiles: EnhancedFieldTile[], 
    screenCoords: Map<string, { x: number; y: number }>,
    currentTime: number = Date.now()
  ) {
    const activeTileIds = new Set<string>();

    tiles.forEach(tile => {
      const screenPos = screenCoords.get(tile.tile_id);
      if (!screenPos || !tile.velocity || tile.velocity.magnitude < 0.5) {
        return; // Skip stationary or off-screen tiles
      }

      activeTileIds.add(tile.tile_id);

      // Update trail segments using AfterglowTrailManager
      AfterglowTrailManager.updateTrail(tile, screenPos.x, screenPos.y, currentTime);

      // Render the trail
      this.renderTileTrail(tile);
    });

    // Clean up trails for tiles that are no longer active
    this.cleanupInactiveTrails(activeTileIds);
  }

  /**
   * Render trail for a single tile using its trail segments
   */
  private renderTileTrail(tile: EnhancedFieldTile) {
    if (!tile.trail_segments || tile.trail_segments.length < 2) {
      this.clearTileTrail(tile.tile_id);
      return;
    }

    // Get or create trail graphics
    let trailGraphics = this.activeTrails.get(tile.tile_id);
    if (!trailGraphics) {
      trailGraphics = new PIXI.Graphics();
      this.trailContainer.addChild(trailGraphics);
      this.activeTrails.set(tile.tile_id, trailGraphics);
    }

    let glowGraphics = this.activeGlowTrails.get(tile.tile_id);
    if (!glowGraphics) {
      glowGraphics = new PIXI.Graphics();
      this.glowContainer.addChild(glowGraphics);
      this.activeGlowTrails.set(tile.tile_id, glowGraphics);
    }

    trailGraphics.clear();
    glowGraphics.clear();

    // Get renderable segments from AfterglowTrailManager
    const renderableSegments = AfterglowTrailManager.getRenderableSegments(tile, 1.0);
    
    // Convert HSL vibe to RGB color
    const baseColor = this.hslToRgb(
      tile.avg_vibe.h / 360,
      tile.avg_vibe.s / 100,
      tile.avg_vibe.l / 100
    );

    // Draw trail segments
    for (let i = 1; i < renderableSegments.length; i++) {
      const prev = renderableSegments[i - 1];
      const curr = renderableSegments[i];

      // Main trail
      trailGraphics.lineStyle(curr.thickness, baseColor, curr.alpha * 0.8);
      trailGraphics.moveTo(prev.x, prev.y);
      trailGraphics.lineTo(curr.x, curr.y);

      // Glow trail
      glowGraphics.lineStyle(curr.thickness * 2, baseColor, curr.alpha * 0.3);
      glowGraphics.moveTo(prev.x, prev.y);
      glowGraphics.lineTo(curr.x, curr.y);
    }

    // Add particle head with extra glow
    const head = renderableSegments[renderableSegments.length - 1];
    if (head) {
      trailGraphics.beginFill(baseColor, head.alpha);
      trailGraphics.drawCircle(head.x, head.y, 3);
      trailGraphics.endFill();

      glowGraphics.beginFill(baseColor, head.alpha * 0.5);
      glowGraphics.drawCircle(head.x, head.y, 8);
      glowGraphics.endFill();
    }
  }

  /**
   * Clear trail for a specific tile
   */
  private clearTileTrail(tileId: string) {
    const trailGraphics = this.activeTrails.get(tileId);
    if (trailGraphics) {
      trailGraphics.clear();
    }

    const glowGraphics = this.activeGlowTrails.get(tileId);
    if (glowGraphics) {
      glowGraphics.clear();
    }
  }

  /**
   * Clean up trails for inactive tiles
   */
  private cleanupInactiveTrails(activeTileIds: Set<string>) {
    for (const [tileId, graphics] of this.activeTrails) {
      if (!activeTileIds.has(tileId)) {
        this.trailContainer.removeChild(graphics);
        graphics.destroy();
        this.activeTrails.delete(tileId);
      }
    }

    for (const [tileId, graphics] of this.activeGlowTrails) {
      if (!activeTileIds.has(tileId)) {
        this.glowContainer.removeChild(graphics);
        graphics.destroy();
        this.activeGlowTrails.delete(tileId);
      }
    }
  }

  /**
   * Update trail decay animations
   */
  update(deltaTime: number) {
    // Trail decay is handled by AfterglowTrailManager
    // This method can be used for additional animations if needed
  }

  /**
   * Clear all trails
   */
  clearAll() {
    for (const [tileId, graphics] of this.activeTrails) {
      this.trailContainer.removeChild(graphics);
      graphics.destroy();
    }
    this.activeTrails.clear();

    for (const [tileId, graphics] of this.activeGlowTrails) {
      this.glowContainer.removeChild(graphics);
      graphics.destroy();
    }
    this.activeGlowTrails.clear();
  }

  /**
   * Convert HSL to RGB color
   */
  private hslToRgb(h: number, s: number, l: number): number {
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return (Math.round(r * 255) << 16) + 
           (Math.round(g * 255) << 8) + 
           Math.round(b * 255);
  }

  /**
   * Get performance stats
   */
  getStats() {
    return {
      activeTrails: this.activeTrails.size,
      activeGlowTrails: this.activeGlowTrails.size,
      containerChildren: this.container.children.length
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.clearAll();
    this.container.destroy({ children: true });
  }
}