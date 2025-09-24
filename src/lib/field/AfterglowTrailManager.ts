import type { EnhancedFieldTile } from '../../../packages/types';

export interface TrailSegment {
  x: number;
  y: number;
  timestamp: number;
  alpha: number;
}

/**
 * Manages afterglow trail rendering with vibe-to-color conversion
 * and patent-compliant decay timing (2-60s)
 */
export class AfterglowTrailManager {
  private static readonly TRAIL_DURATION = 60000; // 60s max trail life
  private static readonly MIN_SEGMENT_DISTANCE = 5; // pixels

  /**
   * Updates trail for a tile with new position
   */
  static updateTrail(tile: EnhancedFieldTile, x: number, y: number, now = Date.now()): void {
    if (!tile.trail_segments) {
      tile.trail_segments = [];
    }

    // Add new segment if moved enough
    const lastSegment = tile.trail_segments[tile.trail_segments.length - 1];
    if (!lastSegment || 
        Math.hypot(x - lastSegment.x, y - lastSegment.y) >= this.MIN_SEGMENT_DISTANCE) {
      tile.trail_segments.push({
        x,
        y,
        timestamp: now,
        alpha: tile.afterglow_intensity ?? 0.5
      });
    }

    // Decay existing segments and remove old ones
    tile.trail_segments = tile.trail_segments
      .map(segment => ({
        ...segment,
        alpha: this.calculateAlpha(segment.timestamp, now, tile.afterglow_intensity ?? 0.5)
      }))
      .filter(segment => segment.alpha > 0.01 && (now - segment.timestamp) < this.TRAIL_DURATION);
  }

  /**
   * Get renderable segments with computed thickness/alpha
   */
  static getRenderableSegments(tile: EnhancedFieldTile, alphaScale = 1): TrailSegment[] {
    if (!tile.trail_segments?.length) return [];

    return tile.trail_segments
      .filter(s => s.alpha > 0.01)
      .map(s => ({
        ...s,
        alpha: s.alpha * alphaScale
      }));
  }

  /**
   * Convert vibe to trail color
   */
  static vibeToTrailColor(vibe: { h: number; s: number; l: number }): string {
    // Enhance saturation and adjust lightness for trails
    const s = Math.min(100, vibe.s * 1.2);
    const l = Math.max(30, Math.min(70, vibe.l));
    return `hsl(${vibe.h}, ${s}%, ${l}%)`;
  }

  /**
   * Calculate alpha based on age and afterglow intensity
   */
  private static calculateAlpha(timestamp: number, now: number, intensity: number): number {
    const age = now - timestamp;
    const maxAge = this.TRAIL_DURATION;
    
    // Exponential decay based on afterglow intensity
    const decay = Math.exp(-age / (maxAge * intensity));
    return Math.max(0, decay);
  }

  /**
   * Clean up old trail segments across all tiles
   */
  static cleanup(tiles: EnhancedFieldTile[], now = Date.now()): void {
    tiles.forEach(tile => {
      if (tile.trail_segments) {
        tile.trail_segments = tile.trail_segments.filter(
          s => (now - s.timestamp) < this.TRAIL_DURATION && s.alpha > 0.01
        );
      }
    });
  }
}