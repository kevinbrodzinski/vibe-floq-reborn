import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FieldTile, EnhancedFieldTile, VelocityVector } from '@/types/field';

/**
 * Ring buffer for efficient temporal data management
 */
class TemporalBuffer<T> {
  private buffer: T[] = [];
  private maxSize: number;

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }

  push(item: T): void {
    this.buffer.push(item);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  getLast(n: number = 1): T[] {
    return this.buffer.slice(-n);
  }

  get length(): number {
    return this.buffer.length;
  }
}

/**
 * Velocity computation based on patent specifications
 */
const computeVelocity = (
  current: FieldTile,
  previous: FieldTile | undefined,
  deltaMS: number
): VelocityVector | undefined => {
  if (!previous || deltaMS <= 0) {
    return { vx: 0, vy: 0, magnitude: 0, heading: 0, confidence: 0 };
  }

  // For now, compute from crowd_count changes as proxy for movement
  // TODO: Replace with actual position delta when location data available
  const crowdDelta = current.crowd_count - previous.crowd_count;
  const timeDeltaS = deltaMS / 1000;
  
  // Simple heuristic velocity based on activity change
  const vx = (crowdDelta * 0.1) / timeDeltaS;
  const vy = 0; // No Y component without actual position data
  const magnitude = Math.abs(vx);
  const heading = vx >= 0 ? 0 : Math.PI;
  
  // Confidence based on time delta and magnitude
  const confidence = Math.min(1, Math.exp(-timeDeltaS / 30)) * 
                    Math.min(1, magnitude / 10);

  return { vx, vy, magnitude, heading, confidence };
};

/**
 * Classify movement mode based on velocity
 */
const classifyMovement = (velocity: VelocityVector): EnhancedFieldTile['movement_mode'] => {
  const speed = velocity.magnitude;
  
  if (speed < 0.5) return 'stationary';
  if (speed <= 2) return 'walking';    // Patent spec: 1-2 m/s
  if (speed <= 8) return 'cycling';    // Patent spec: 3-8 m/s
  if (speed <= 30) return 'driving';   // Patent spec: 8-30 m/s
  return 'transit';
};

interface UseEnhancedFieldTilesOptions {
  tileIds: string[];
  updateInterval?: number;
  enablePhysics?: boolean;
}

/**
 * Enhanced field tiles hook with client-side velocity computation
 * and temporal buffering for smooth physics
 */
export function useEnhancedFieldTiles({
  tileIds,
  updateInterval = 2000,
  enablePhysics = true
}: UseEnhancedFieldTilesOptions) {
  const queryClient = useQueryClient();
  const tileHistoryRef = useRef<Map<string, TemporalBuffer<FieldTile>>>(new Map());
  const previousTilesRef = useRef<Map<string, FieldTile>>(new Map());
  const lastUpdateRef = useRef<number>(Date.now());

  const { data: tiles, refetch, isLoading, error } = useQuery({
    queryKey: ['enhanced-field-tiles', tileIds.join(',')],
    queryFn: async (): Promise<EnhancedFieldTile[]> => {
      if (tileIds.length === 0) return [];

      // Call the standard get_field_tiles function (no synthetic velocity)
      const { data, error } = await supabase.functions.invoke('get_field_tiles', {
        body: { tile_ids: tileIds }
      });

      if (error) throw error;
      if (!data?.tiles) return [];

      const now = Date.now();
      const deltaMS = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      // Process tiles with client-side physics
      const enhancedTiles: EnhancedFieldTile[] = data.tiles.map((tile: FieldTile) => {
        const previousTile = previousTilesRef.current.get(tile.tile_id);
        
        // Update temporal buffer
        if (!tileHistoryRef.current.has(tile.tile_id)) {
          tileHistoryRef.current.set(tile.tile_id, new TemporalBuffer(10));
        }
        tileHistoryRef.current.get(tile.tile_id)!.push(tile);

        let enhanced: EnhancedFieldTile = { ...tile };

        if (enablePhysics) {
          // Compute real velocity from position/activity deltas
          const velocity = computeVelocity(tile, previousTile, deltaMS);
          if (velocity) {
            enhanced.velocity = velocity;
            enhanced.movement_mode = classifyMovement(velocity);
            
            // Momentum based on velocity stability
            enhanced.momentum = velocity.confidence * 
              Math.min(velocity.magnitude / 5, 1); // normalized 0-1
          }

          // Afterglow intensity based on recent activity
          const timeSinceUpdate = now - new Date(tile.updated_at).getTime();
          enhanced.afterglow_intensity = Math.max(0, 
            1.0 - (timeSinceUpdate / 60000) // 1 minute decay
          ) * Math.min(tile.crowd_count / 50, 1); // normalized by crowd
        }

        // Store for next iteration
        previousTilesRef.current.set(tile.tile_id, tile);
        return enhanced;
      });

      return enhancedTiles;
    },
    refetchInterval: updateInterval,
    staleTime: updateInterval / 2,
  });

  // Expose tile history for advanced visualizations
  const getTileHistory = useCallback((tileId: string) => {
    return tileHistoryRef.current.get(tileId)?.getLast(10) || [];
  }, []);

  // Aggregate metrics for observability
  const aggregateMetrics = tiles ? {
    totalCrowd: tiles.reduce((sum, t) => sum + t.crowd_count, 0),
    averageVelocity: tiles.reduce((sum, t) => 
      sum + (t.velocity?.magnitude || 0), 0) / tiles.length,
    movementModes: tiles.reduce((acc, t) => {
      if (t.movement_mode) {
        acc[t.movement_mode] = (acc[t.movement_mode] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>),
    averageAfterglow: tiles.reduce((sum, t) => 
      sum + (t.afterglow_intensity || 0), 0) / tiles.length,
  } : null;

  return {
    tiles: tiles || [],
    aggregateMetrics,
    isLoading,
    error,
    refetch,
    getTileHistory,
  };
}