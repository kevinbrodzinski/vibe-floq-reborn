import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  VelocityComputer, 
  SocialPhysicsCalculator, 
  AfterglowTrailManager,
  TemporalBuffer 
} from '@/lib/field/physics';
import { EnhancedFieldSystem } from '@/lib/field/EnhancedFieldSystem';
import type { 
  EnhancedFieldTile
} from '../../packages/types/domain/enhanced-field';
import { validateEnhancedTiles } from '@/lib/field/validateEnhancedTiles';
import { boundsToGridCells } from '@/lib/field/boundsToGridCells';

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

interface ConvergenceEvent {
  id: string;
  tileA: string;
  tileB: string;
  meetingPoint: { lat: number; lng: number };
  timeToMeet: number;
  probability: number;
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
  const fieldSystemRef = useRef<EnhancedFieldSystem | null>(null);
  
  // Initialize enhanced field system
  if (!fieldSystemRef.current) {
    fieldSystemRef.current = new EnhancedFieldSystem(10, 0.6);
  }

  // Convert bounds to grid cell IDs for the API call
  const tileIds = bounds ? getBoundsTileIds(bounds) : [];

  // Main query for enhanced field tiles
  const { data: tiles, refetch, isLoading, error } = useQuery({
    queryKey: ['enhanced-field-tiles', tileIds, includeHistory, timeWindow],
    queryFn: async () => {
      if (tileIds.length === 0) return [];
      
      // Call enhanced edge function
      const { data, error } = await supabase.functions.invoke('get_field_tiles_enhanced', {
        body: {
          grid_cells: tileIds,
          include_history: includeHistory,
          time_window_minutes: parseTimeWindowToMinutes(timeWindow),
          audience: 'public' // TODO: derive from user permissions
        }
      });
      
      if (error) throw error;
      
      // Validate the response schema
      const validated = validateEnhancedTiles(data, { allowPartial: true });
      const rawTiles = validated.tiles;
      
      if (!enablePhysics || rawTiles.length === 0) {
        return rawTiles;
      }
      
      // Process through enhanced field system
      const result = fieldSystemRef.current!.updateTiles(rawTiles);
      
      // Store convergences for aggregate metrics
      const convergenceData = result.convergences;
      
      return {
        tiles: result.enhancedTiles,
        convergences: convergenceData,
        trailStats: result.trailStats
      };
    },
    refetchInterval: updateInterval,
    staleTime: updateInterval / 2,
    enabled: tileIds.length > 0
  });

  // Set up real-time subscription for vibes_now updates
  useEffect(() => {
    if (!tileIds.length) return;
    
    // Use Set for efficient grid cell filtering
    const gridCellSet = new Set(tileIds);
    
    const channel = supabase
      .channel('vibes-now-field-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vibes_now'
        },
        (payload) => {
          // Check if the update affects any of our grid cells
          const newRecord = payload.new as any;
          if (newRecord?.h3_7 && gridCellSet.has(newRecord.h3_7)) {
            // Invalidate and refetch on real-time update
            queryClient.invalidateQueries({
              queryKey: ['enhanced-field-tiles']
            });
          }
        }
      )
      .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, [tileIds.join(','), queryClient]);

  // Enhanced aggregate metrics with convergence data
  const aggregateMetrics = useMemo(() => {
    if (!tiles) return null;
    
    // Handle both array and object responses consistently
    const tileArray = Array.isArray(tiles) ? tiles : (tiles.tiles || []);
    const convergences = Array.isArray(tiles) ? [] : (tiles.convergences || []);
    
    return {
      totalCrowd: tileArray.reduce((sum: number, t: EnhancedFieldTile) => sum + t.crowd_count, 0),
      averageVelocity: tileArray.reduce((sum: number, t: EnhancedFieldTile) => 
        sum + (t.velocity?.magnitude || 0), 0) / Math.max(1, tileArray.length),
      dominantMovementMode: getDominantMovementMode(tileArray),
      convergencePredictions: convergences,
      averageCohesion: tileArray.reduce((sum: number, t: EnhancedFieldTile) => 
        sum + (t.cohesion_score || 0), 0) / Math.max(1, tileArray.length),
      highActivityTiles: tileArray
        .filter((t: EnhancedFieldTile) => t.afterglow_intensity && t.afterglow_intensity > 0.7)
        .map((t: EnhancedFieldTile) => t.tile_id),
      systemStats: fieldSystemRef.current?.getStats()
    };
  }, [tiles]);

  // Extract tile data for return consistency
  const tileData = tiles ? (Array.isArray(tiles) ? tiles : (tiles.tiles || [])) : [];
  const convergenceData = Array.isArray(tiles) ? [] : (tiles?.convergences || []);
  
  return {
    data: tileData, // Maintain backward compatibility
    tiles: tileData,
    convergences: convergenceData,
    aggregateMetrics,
    isLoading,
    error,
    refetch,
    // Enhanced system methods
    updateTrailRendering: (screenProjection: (lat: number, lng: number) => { x: number; y: number }) => {
      if (fieldSystemRef.current) {
        fieldSystemRef.current.updateTrailRendering(tileData, screenProjection);
      }
    },
    getActiveConvergences: () => fieldSystemRef.current?.getActiveConvergences() || [],
    cleanupConvergences: () => fieldSystemRef.current?.cleanupConvergences(),
    // Expose tile history for advanced visualizations (compatibility)
    getTileHistory: (tileId: string) => {
      // Return empty array for compatibility with existing code
      return [];
    },
    // Helper for PIXI rendering with enhanced trail data
    getTileTrails: () => {
      const trails: Array<{
        tileId: string;
        segments: Array<{ x: number; y: number; timestamp: number; alpha: number; }>;
        renderableSegments: ReturnType<typeof AfterglowTrailManager.getRenderableSegments>;
      }> = [];
      
      tileData.forEach(tile => {
        if (tile.trail_segments && tile.trail_segments.length > 0) {
          trails.push({
            tileId: tile.tile_id,
            segments: tile.trail_segments,
            renderableSegments: AfterglowTrailManager.getRenderableSegments(tile)
          });
        }
      });
      
      return trails;
    }
  };
}

// Helper functions
function getBoundsTileIds(bounds: TileBounds): string[] {
  if (!bounds) return [];
  
  try {
    return boundsToGridCells(bounds);
  } catch (error) {
    console.warn('Failed to get grid cells from bounds:', error);
    return [];
  }
}

function parseTimeWindowToMinutes(timeWindow: string): number {
  const match = timeWindow.match(/(\d+)\s*(minute|hour)s?/);
  if (!match) return 10; // default 10 minutes
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  return unit === 'hour' ? value * 60 : value;
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
    .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'stationary';
}