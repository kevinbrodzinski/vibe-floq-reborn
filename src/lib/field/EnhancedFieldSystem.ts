import type { EnhancedFieldTile } from '../../../packages/types/domain/enhanced-field';
import { VelocityComputer, SocialPhysicsCalculator, AfterglowTrailManager } from './physics';

/**
 * Unified enhanced field tiles system manager
 * Coordinates physics calculations, trail management, and convergence detection
 */

// Local lightweight type for convergence events used internally
interface ConvergenceEvent {
  id: string;
  a: string;
  b: string;
  meeting: { x: number; y: number };
  etaMs: number;
  dStar: number;
  confidence: number;
}

export class EnhancedFieldSystem {
  private tileHistory = new Map<string, EnhancedFieldTile[]>();
  private convergenceEvents = new Map<string, ConvergenceEvent>();
  private lastUpdateTime = Date.now();
  
  constructor(
    private readonly maxHistoryLength = 10,
    private readonly convergenceThreshold = 0.6
  ) {}
  
  /**
   * Update the system with new tile data
   */
  updateTiles(newTiles: EnhancedFieldTile[]): {
    enhancedTiles: EnhancedFieldTile[];
    convergences: ConvergenceEvent[];
    trailStats: ReturnType<typeof AfterglowTrailManager.getTrailStats>;
  } {
    const now = Date.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000;
    
    // Process each tile
    const enhancedTiles = newTiles.map(tile => {
      // Update temporal history
      this.updateTileHistory(tile);
      
      // Compute enhanced velocity if history exists
      const history = this.tileHistory.get(tile.tile_id) || [];
      if (history.length >= 2) {
        const previous = history[history.length - 2];
        const enhanced = this.enhanceVelocityComputation(tile, previous);
        Object.assign(tile, enhanced);
      }
      
      // Update trail segments
      if (tile.afterglow_intensity && tile.afterglow_intensity > 0.1) {
        AfterglowTrailManager.updateSegmentDecay(tile, now);
      }
      
      return tile;
    });
    
    // Compute cohesion scores with neighborhood awareness
    this.computeCohesionScores(enhancedTiles);
    
    // Detect convergence events
    const convergences = this.detectConvergenceEvents(enhancedTiles);
    
    // Get trail statistics for performance monitoring
    const trailStats = AfterglowTrailManager.getTrailStats(enhancedTiles);
    
    this.lastUpdateTime = now;
    
    return {
      enhancedTiles,
      convergences,
      trailStats
    };
  }
  
  /**
   * Update temporal history for a tile
   */
  private updateTileHistory(tile: EnhancedFieldTile): void {
    if (!this.tileHistory.has(tile.tile_id)) {
      this.tileHistory.set(tile.tile_id, []);
    }
    
    const history = this.tileHistory.get(tile.tile_id)!;
    history.push({...tile});
    
    // Maintain max history length
    if (history.length > this.maxHistoryLength) {
      history.shift();
    }
  }
  
  /**
   * Enhanced velocity computation with confidence scoring
   */
  private enhanceVelocityComputation(
    current: EnhancedFieldTile, 
    previous: EnhancedFieldTile
  ): Partial<EnhancedFieldTile> {
    if (!current.history?.[0] || !previous.history?.[0]) {
      return {};
    }
    
    // Use the physics calculator for precise velocity
    const velocity = VelocityComputer.computeVelocity(
      current.history[0],
      previous.history[0]
    );
    
    // Calculate confidence with additional factors
    const deltaTime = (Date.now() - new Date(previous.updated_at).getTime()) / 1000;
    const distance = this.calculateDistance(current, previous);
    const confidence = VelocityComputer.calculateConfidence ? 
      VelocityComputer.calculateConfidence(velocity, deltaTime, distance) : 0.5;
    
    // Smooth velocity using exponential moving average
    if (previous.velocity) {
      const smoothed = VelocityComputer.smoothVelocity(velocity, previous.velocity, 0.3);
      velocity.vx = smoothed.vx;
      velocity.vy = smoothed.vy;
      velocity.magnitude = smoothed.magnitude;
      velocity.heading = smoothed.heading;
    }
    
    velocity.confidence = confidence;
    
    // Calculate momentum from velocity history
    const history = this.tileHistory.get(current.tile_id) || [];
    const velocityHistory = history.map(h => h.velocity).filter(Boolean);
    const momentum = velocityHistory.length > 1 
      ? VelocityComputer.calculateMomentum(velocityHistory)
      : 0;
    
    return {
      velocity,
      movement_mode: VelocityComputer.classifyMovement(velocity),
      momentum
    };
  }
  
  /**
   * Compute cohesion scores with spatial neighborhood awareness
   */
  private computeCohesionScores(tiles: EnhancedFieldTile[]): void {
    // Create spatial index for efficient neighbor finding
    const spatialIndex = new Map<string, EnhancedFieldTile[]>();
    
    tiles.forEach(tile => {
      // Get tile center coordinates
      const centerLat = tile.center?.[1] || 0;
      const centerLng = tile.center?.[0] || 0;
      const gridLat = Math.floor(centerLat * 1000);
      const gridLng = Math.floor(centerLng * 1000);
      
      // Check surrounding grid cells for neighbors
      for (let dLat = -1; dLat <= 1; dLat++) {
        for (let dLng = -1; dLng <= 1; dLng++) {
          const key = `${gridLat + dLat},${gridLng + dLng}`;
          if (!spatialIndex.has(key)) {
            spatialIndex.set(key, []);
          }
        }
      }
      
      const key = `${gridLat},${gridLng}`;
      if (!spatialIndex.has(key)) {
        spatialIndex.set(key, []);
      }
      spatialIndex.get(key)!.push(tile);
    });
    
    // Compute cohesion for each tile
    tiles.forEach(tile => {
      const centerLat = tile.center?.[1] || 0;
      const centerLng = tile.center?.[0] || 0;
      const gridLat = Math.floor(centerLat * 1000);
      const gridLng = Math.floor(centerLng * 1000);
      
      // Find neighbors in surrounding cells
      const neighbors: EnhancedFieldTile[] = [];
      for (let dLat = -1; dLat <= 1; dLat++) {
        for (let dLng = -1; dLng <= 1; dLng++) {
          const key = `${gridLat + dLat},${gridLng + dLng}`;
          const cellTiles = spatialIndex.get(key) || [];
          neighbors.push(...cellTiles.filter(t => t.tile_id !== tile.tile_id));
        }
      }
      
      // Compute cohesion score
      tile.cohesion_score = SocialPhysicsCalculator.computeCohesion(tile, neighbors);
    });
  }
  
  /**
   * Detect convergence events between tiles
   */
  private detectConvergenceEvents(tiles: EnhancedFieldTile[]): ConvergenceEvent[] {
    const convergences: ConvergenceEvent[] = [];
    
    // Check all pairs for convergence
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        const tileA = tiles[i];
        const tileB = tiles[j];
        
        const convergence = SocialPhysicsCalculator.detectConvergence(tileA, tileB);
        
        if (convergence && convergence.probability >= this.convergenceThreshold) {
          const meetingPoint = SocialPhysicsCalculator.predictMeetingPoint(
            tileA, 
            tileB, 
            convergence.time_to_converge
          );
          
          if (meetingPoint) {
            const eventId = `${tileA.tile_id}-${tileB.tile_id}`;
            const event: ConvergenceEvent = {
              id: eventId,
              a: tileA.tile_id,
              b: tileB.tile_id,
              meeting: { 
                x: meetingPoint.lng, 
                y: meetingPoint.lat 
              },
              etaMs: convergence.time_to_converge * 1000,
              dStar: this.calculateDistance(tileA, tileB),
              confidence: convergence.probability
            };
            
            convergences.push(event);
            this.convergenceEvents.set(eventId, event);
            
            // Update tiles with convergence vectors
            tileA.convergence_vector = convergence;
          }
        }
      }
    }
    
    return convergences;
  }
  
  /**
   * Calculate distance between two tiles in meters
   */
  private calculateDistance(tileA: EnhancedFieldTile, tileB: EnhancedFieldTile): number {
    const R = 6371000; // Earth radius in meters
    
    // Extract coordinates from center array [lng, lat]
    const latA = tileA.center?.[1] || 0;
    const lngA = tileA.center?.[0] || 0;
    const latB = tileB.center?.[1] || 0; 
    const lngB = tileB.center?.[0] || 0;
    
    const dLat = (latB - latA) * Math.PI / 180;
    const dLng = (lngB - lngA) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(latA * Math.PI / 180) * Math.cos(latB * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  /**
   * Update trail rendering for PIXI.js integration
   */
  updateTrailRendering(
    tiles: EnhancedFieldTile[],
    screenProjection: (lat: number, lng: number) => { x: number; y: number }
  ): void {
    tiles.forEach(tile => {
      if (tile.afterglow_intensity && tile.afterglow_intensity > 0.1) {
        const lat = tile.center?.[1] || 0;
        const lng = tile.center?.[0] || 0;
        const screenPos = screenProjection(lat, lng);
        AfterglowTrailManager.updateTrail(tile, screenPos.x, screenPos.y);
      }
    });
  }
  
  /**
   * Get convergence events for rendering
   */
  getActiveConvergences(): ConvergenceEvent[] {
    return Array.from(this.convergenceEvents.values())
      .filter(event => event.etaMs > 0 && event.confidence >= this.convergenceThreshold);
  }
  
  /**
   * Clean up old convergence events
   */
  cleanupConvergences(maxAge: number = 300000): void { // 5 minutes
    const now = Date.now();
    for (const [id, event] of this.convergenceEvents.entries()) {
      if (now - (event.etaMs) > maxAge) {
        this.convergenceEvents.delete(id);
      }
    }
  }
  
  /**
   * Get system statistics
   */
  getStats(): {
    totalTiles: number;
    activeTiles: number;
    convergenceEvents: number;
    avgVelocity: number;
    avgCohesion: number;
  } {
    const allTiles = Array.from(this.tileHistory.values()).flat();
    const activeTiles = allTiles.filter(tile => 
      tile.afterglow_intensity && tile.afterglow_intensity > 0.1
    );
    
    return {
      totalTiles: this.tileHistory.size,
      activeTiles: activeTiles.length,
      convergenceEvents: this.convergenceEvents.size,
      avgVelocity: activeTiles.reduce((sum, tile) => 
        sum + (tile.velocity?.magnitude || 0), 0) / Math.max(1, activeTiles.length),
      avgCohesion: activeTiles.reduce((sum, tile) => 
        sum + (tile.cohesion_score || 0), 0) / Math.max(1, activeTiles.length)
    };
  }
}