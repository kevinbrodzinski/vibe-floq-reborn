import type { EnhancedFieldTile } from '../../../../packages/types/domain/enhanced-field';

/**
 * Afterglow trail management based on patent τ: 2-60s decay
 * Manages trail segments and decay animations
 */
export class AfterglowTrailManager {
  private static readonly MIN_DECAY_TIME = 2000; // 2 seconds
  private static readonly MAX_DECAY_TIME = 60000; // 60 seconds
  private static readonly MAX_TRAIL_LENGTH = 30; // meters (from patent)
  private static readonly MAX_SEGMENTS = 20; // Maximum segments per trail
  private static readonly MIN_SEGMENT_DISTANCE = 1.5; // meters between segments
  
  /**
   * Update trail segments for a tile
   */
  static updateTrail(
    tile: EnhancedFieldTile,
    screenX: number,
    screenY: number,
    currentTime: number = Date.now()
  ): void {
    // Initialize trail if needed
    if (!tile.trail_segments) {
      tile.trail_segments = [];
    }
    
    // Only add segment if moved enough distance
    if (tile.trail_segments.length > 0) {
      const lastSegment = tile.trail_segments[tile.trail_segments.length - 1];
      const distance = Math.sqrt(
        Math.pow(screenX - lastSegment.x, 2) + 
        Math.pow(screenY - lastSegment.y, 2)
      );
      
      // Convert screen pixels to approximate meters (rough estimate)
      const metersPerPixel = 0.1; // Adjust based on zoom level
      if (distance * metersPerPixel < this.MIN_SEGMENT_DISTANCE) {
        return; // Don't add segment if too close
      }
    }
    
    // Add new segment
    tile.trail_segments.push({
      x: screenX,
      y: screenY,
      timestamp: currentTime,
      alpha: 1.0
    });
    
    // Limit trail length
    if (tile.trail_segments.length > this.MAX_SEGMENTS) {
      tile.trail_segments = tile.trail_segments.slice(-this.MAX_SEGMENTS);
    }
    
    // Update alpha decay for all segments
    this.updateSegmentDecay(tile, currentTime);
  }
  
  /**
   * Update alpha decay for all segments in a trail
   */
  static updateSegmentDecay(
    tile: EnhancedFieldTile,
    currentTime: number = Date.now()
  ): void {
    if (!tile.trail_segments) return;
    
    // Calculate decay time based on afterglow intensity
    const decayTime = this.MIN_DECAY_TIME + 
      (this.MAX_DECAY_TIME - this.MIN_DECAY_TIME) * 
      (tile.afterglow_intensity || 0.5);
    
    // Update alpha and filter out invisible segments
    tile.trail_segments = tile.trail_segments
      .map((segment, index) => {
        const age = currentTime - segment.timestamp;
        
        // Exponential decay with position-based fade
        const timeFade = Math.max(0, 1 - (age / decayTime));
        const positionFade = (index + 1) / tile.trail_segments!.length; // newer = brighter
        const intensityFade = tile.afterglow_intensity || 1.0;
        
        return {
          ...segment,
          alpha: timeFade * positionFade * intensityFade
        };
      })
      .filter(segment => segment.alpha > 0.01); // Remove invisible segments
  }
  
  /**
   * Get trail segments ready for rendering
   */
  /**
   * Map raw segments to draw-ready geometry with thickness/alpha.
   * Returns oldest→newest in array order.
   */
  static getRenderableSegments(tile: EnhancedFieldTile, headScale = 1.0): Array<{
    x:number; y:number; alpha:number; thickness:number;
  }> {
    const segs = tile.trail_segments ?? [];
    if (segs.length < 2) return [];
    const maxW = 4; // px line width budget
    const speed = tile.velocity?.magnitude ?? 0;
    const baseW = Math.min(maxW, 1 + (speed/10) * 3);

    const out: Array<{x:number;y:number;alpha:number;thickness:number}> = [];
    for (let i=0;i<segs.length;i++){
      const s = segs[i];
      const t = i / Math.max(1, segs.length - 1);           // 0..1 along trail
      const thickness = Math.max(1, baseW * (0.4 + 0.6*t)); // thinner at tail
      const alpha = s.alpha * (0.5 + 0.5*t);                 // brighter near head
      out.push({ x: s.x, y: s.y, alpha, thickness });
    }
    // punch up the head slightly
    out[out.length-1].thickness *= (1.0 + 0.25*headScale);
    out[out.length-1].alpha     *= (1.0 + 0.15*headScale);
    return out;
  }
  
  /**
   * Clear trail segments for a tile
   */
  static clearTrail(tile: EnhancedFieldTile): void {
    tile.trail_segments = [];
  }
  
  /**
   * Calculate optimal decay time based on movement and intensity
   */
  static calculateDecayTime(
    tile: EnhancedFieldTile,
    baseFactor: number = 1.0
  ): number {
    const velocity = tile.velocity?.magnitude || 0;
    const intensity = tile.afterglow_intensity || 0.5;
    
    // Faster movement = longer trails (within limits)
    const velocityFactor = Math.min(2, 1 + velocity / 10);
    
    // Higher intensity = longer trails
    const intensityFactor = 0.5 + intensity * 0.5;
    
    const decayTime = this.MIN_DECAY_TIME + 
      (this.MAX_DECAY_TIME - this.MIN_DECAY_TIME) * 
      intensityFactor * velocityFactor * baseFactor;
    
    return Math.min(this.MAX_DECAY_TIME, Math.max(this.MIN_DECAY_TIME, decayTime));
  }
  
  /**
   * Get trail statistics for performance monitoring
   */
  static getTrailStats(tiles: EnhancedFieldTile[]): {
    totalTrails: number;
    totalSegments: number;
    averageSegmentsPerTrail: number;
    oldestSegmentAge: number;
    newestSegmentAge: number;
  } {
    const tilesWithTrails = tiles.filter(tile => 
      tile.trail_segments && tile.trail_segments.length > 0
    );
    
    const totalSegments = tilesWithTrails.reduce((sum, tile) => 
      sum + (tile.trail_segments?.length || 0), 0
    );
    
    let oldestAge = 0;
    let newestAge = Infinity;
    const now = Date.now();
    
    tilesWithTrails.forEach(tile => {
      tile.trail_segments?.forEach(segment => {
        const age = now - segment.timestamp;
        oldestAge = Math.max(oldestAge, age);
        newestAge = Math.min(newestAge, age);
      });
    });
    
    return {
      totalTrails: tilesWithTrails.length,
      totalSegments,
      averageSegmentsPerTrail: tilesWithTrails.length > 0 ? 
        totalSegments / tilesWithTrails.length : 0,
      oldestSegmentAge: oldestAge,
      newestSegmentAge: newestAge === Infinity ? 0 : newestAge
    };
  }
  
  /**
   * Convert HSL to hex color
   */
  private static hslToHex(h: number, s: number, l: number): number {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l;
    } else {
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
}