import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  VelocityComputer, 
  SocialPhysicsCalculator, 
  AfterglowTrailManager,
  TemporalBuffer 
} from '@/lib/field/physics';
import type { EnhancedFieldTile, FieldTile, TemporalSnapshot } from '@/types/field';

interface TileBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  precision?: number;
}

interface UseEnhancedFieldTilesOptions {
  bounds?: TileBounds;
  includeHistory?: boolean;
  timeWindow?: string; // e.g., '5 minutes'
  updateInterval?: number; // milliseconds
  enablePhysics?: boolean;
}

/**
 * Enhanced field tiles with velocity computation and social physics
 * Implements patent-compliant temporal analysis and movement classification
 */
export function useEnhancedFieldTiles(options: UseEnhancedFieldTilesOptions = {}) {
  const {
    bounds,
    includeHistory = true,
    timeWindow = '5 minutes',
    updateInterval = 2000, // 2 second default from patent specs
    enablePhysics = true
  } = options;
  const queryClient = useQueryClient();
  const tileHistoryRef = useRef<Map<string, TemporalBuffer<EnhancedFieldTile>>>(new Map());
  const previousTilesRef = useRef<Map<string, EnhancedFieldTile>>(new Map());

  // Convert bounds to tile IDs for the API call
  const tileIds = bounds ? getBoundsTileIds(bounds) : [];

  // Main query for enhanced field tiles
  const { data: tiles, refetch, isLoading, error } = useQuery({
    queryKey: ['enhanced-field-tiles', tileIds, includeHistory, timeWindow],
    queryFn: async () => {
      if (tileIds.length === 0) return [];
      
      // Call enhanced edge function
      const { data, error } = await supabase.functions.invoke('get_field_tiles_enhanced', {
        body: {
          tile_ids: tileIds,
          include_history: includeHistory,
          time_window: timeWindow
        }
      });
      
      if (error) throw error;
      
      // Process tiles with client-side physics calculations
      const enhancedTiles = (data?.tiles || []).map((tile: EnhancedFieldTile) => {
        const previousTile = previousTilesRef.current.get(tile.tile_id);
        
        // Update temporal buffer
        if (!tileHistoryRef.current.has(tile.tile_id)) {
          tileHistoryRef.current.set(tile.tile_id, new TemporalBuffer(10));
        }
        const buffer = tileHistoryRef.current.get(tile.tile_id)!;
        buffer.push(tile);
        
        // Compute client-side physics if enabled
        if (enablePhysics) {
          // Smooth velocity using exponential moving average
          if (previousTile?.velocity && tile.velocity) {
            tile.velocity = VelocityComputer.smoothVelocity(
              tile.velocity, 
              previousTile.velocity, 
              0.3 // smoothing factor
            );
          }
          
          // Calculate momentum from velocity history
          const velocityHistory = buffer.getAll()
            .map(t => t.velocity)
            .filter(Boolean);
          if (velocityHistory.length > 1) {
            tile.momentum = VelocityComputer.calculateMomentum(velocityHistory);
          }
          
          // Update afterglow trail segments
          if (tile.afterglow_intensity && tile.afterglow_intensity > 0) {
            // Initialize trail segments if needed
            if (!tile.trail_segments) {
              tile.trail_segments = previousTile?.trail_segments || [];
            }
          }
        }
        
        // Store for next update
        previousTilesRef.current.set(tile.tile_id, tile);
        
        return tile;
      });
      
      // Compute convergence between tiles
      if (enablePhysics && enhancedTiles.length > 1) {
        for (let i = 0; i < enhancedTiles.length; i++) {
          for (let j = i + 1; j < enhancedTiles.length; j++) {
            const convergence = SocialPhysicsCalculator.detectConvergence(
              enhancedTiles[i],
              enhancedTiles[j]
            );
            if (convergence && convergence.probability > 0.5) {
              enhancedTiles[i].convergence_vector = convergence;
            }
          }
        }
      }
      
      return enhancedTiles;
    },
    refetchInterval: updateInterval,
    staleTime: updateInterval / 2,
    enabled: tileIds.length > 0
  });

  // Set up real-time subscription for instant updates
  useEffect(() => {
    if (!tileIds.length) return;
    
    const channel = supabase
      .channel('field-tiles-enhanced')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'field_tiles',
          filter: `tile_id=in.(${tileIds.join(',')})`
        },
        () => {
          // Invalidate and refetch on real-time update
          queryClient.invalidateQueries({
            queryKey: ['enhanced-field-tiles']
          });
        }
      )
      .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, [tileIds.join(','), queryClient]);

  // Compute aggregate metrics across all tiles
  const aggregateMetrics = useMemo(() => {
    if (!tiles) return null;
    
    return {
      totalCrowd: tiles.reduce((sum, t) => sum + t.crowd_count, 0),
      averageVelocity: tiles.reduce((sum, t) => 
        sum + (t.velocity?.magnitude || 0), 0) / Math.max(1, tiles.length),
      dominantMovementMode: getDominantMovementMode(tiles),
      convergencePredictions: tiles
        .filter(t => t.convergence_vector)
        .map(t => t.convergence_vector!),
      averageCohesion: tiles.reduce((sum, t) => 
        sum + (t.cohesion_score || 0), 0) / Math.max(1, tiles.length),
      highActivityTiles: tiles
        .filter(t => t.afterglow_intensity && t.afterglow_intensity > 0.7)
        .map(t => t.tile_id)
    };
  }, [tiles]);

  return {
    data: tiles || [], // Maintain backward compatibility with existing components
    tiles: tiles || [],
    aggregateMetrics,
    isLoading,
    error,
    refetch,
    // Expose history for advanced visualizations
    getTileHistory: (tileId: string) => 
      tileHistoryRef.current.get(tileId)?.getAll() || [],
    // Helper for PIXI rendering
    getTileTrails: () => {
      const trails: Array<{
        tileId: string;
        segments: NonNullable<EnhancedFieldTile['trail_segments']>;
      }> = [];
      
      tiles?.forEach(tile => {
        if (tile.trail_segments && tile.trail_segments.length > 0) {
          trails.push({
            tileId: tile.tile_id,
            segments: tile.trail_segments
          });
        }
      });
      
      return trails;
    }
  };
}

// Helper functions
function getBoundsTileIds(bounds: TileBounds): string[] {
  // Integrate with existing viewportToTileIds function
  if (!bounds) return [];
  
  try {
    // Import the existing function
    const { viewportToTileIds } = require('@/lib/geo');
    return viewportToTileIds(
      bounds.minLat,
      bounds.maxLat,
      bounds.minLng,
      bounds.maxLng,
      bounds.precision ?? 6
    ).sort();
  } catch (error) {
    console.warn('Failed to get tile IDs from bounds:', error);
    return [];
  }
}

function getDominantMovementMode(tiles: EnhancedFieldTile[]): string {
  const modes = tiles
    .map(t => t.movement_mode)
    .filter(Boolean)
    .reduce((acc, mode) => {
      acc[mode!] = (acc[mode!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
  return Object.entries(modes)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'stationary';
}