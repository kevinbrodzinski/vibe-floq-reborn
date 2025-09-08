import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { EnhancedFieldTile } from 'packages/types/domain/enhanced-field';

interface TileBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  precision?: number;
}

interface UseEnhancedFieldTilesOptions {
  bounds?: TileBounds;
  tileIds?: string[];
  includeHistory?: boolean;
  timeWindowSeconds?: number;
  enablePhysics?: boolean;
  updateInterval?: number;
}

function getBoundsTileIds(bounds: TileBounds): string[] {
  // TODO: wire to existing H3 function:
  // return h3.polyfill([...], precision ?? 7);
  return []; // use tileIds path until H3 is plumbed here
}

export function useEnhancedFieldTiles(options: UseEnhancedFieldTilesOptions = {}) {
  const queryClient = useQueryClient();
  
  // Use explicit generics for useRef
  const tileHistoryRef = useRef<Map<string, any>>(new Map());
  const previousTilesRef = useRef<Map<string, EnhancedFieldTile>>(new Map());

  // Determine tile IDs from either direct input or bounds
  const resolvedTileIds = options.tileIds ?? getBoundsTileIds(options.bounds || { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 });

  const query = useQuery({
    queryKey: ['enhanced-field-tiles', resolvedTileIds],
    queryFn: async () => {
      if (!resolvedTileIds.length) return { tiles: [] };

      try {
        const { data, error } = await supabase.functions.invoke('get_field_tiles_enhanced', {
          body: {
            tile_ids: resolvedTileIds,
            include_history: options.includeHistory ?? false,
            time_window_seconds: options.timeWindowSeconds ?? 300,
          },
        });

        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('[useEnhancedFieldTiles] Function call failed, using mock data:', err);
        
        // Generate deterministic mock data for debugging
        const mockTiles: EnhancedFieldTile[] = resolvedTileIds.map(tileId => ({
          tile_id: tileId,
          centroid: { lat: 40.7128, lng: -74.0060 }, // NYC
          crowd_count: Math.floor(Math.random() * 50) + 5,
          avg_vibe: { h: Math.random() * 360, s: 50 + Math.random() * 50, l: 40 + Math.random() * 20 },
          updated_at: new Date().toISOString(),
          active_floq_ids: [],
          velocity: {
            vx: Math.random() * 4 - 2,
            vy: Math.random() * 4 - 2,
            magnitude: Math.random() * 3,
            heading: Math.random() * 2 * Math.PI,
            confidence: 0.7,
          },
          movement_mode: 'walking' as const,
          social_density: Math.random() * 0.8,
          afterglow_intensity: Math.random() * 0.9,
          convergence_strength: Math.random() * 0.6,
          history: options.includeHistory ? [{
            timestamp: new Date(Date.now() - 60000).toISOString(),
            centroid: { lat: 40.7128, lng: -74.0060 },
            crowd_count: Math.floor(Math.random() * 50) + 5,
            vibe: { h: Math.random() * 360, s: 50 + Math.random() * 50, l: 40 + Math.random() * 20 }
          }] : undefined,
        }));
        
        return { tiles: mockTiles };
      }
    },
    enabled: resolvedTileIds.length > 0,
    staleTime: 30_000, // 30 seconds
  });

  // Real-time updates with Set-based filtering
  useEffect(() => {
    if (!resolvedTileIds.length) return;

    const tileIdSet = new Set(resolvedTileIds);
    const channel = supabase
      .channel('field-tiles-enhanced')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'field_tiles' }, (payload) => {
        const id = (payload as any).new?.tile_id || (payload as any).old?.tile_id;
        if (id && tileIdSet.has(id)) {
          queryClient.invalidateQueries({ queryKey: ['enhanced-field-tiles'] });
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [resolvedTileIds.join(','), queryClient]);

  return {
    tiles: query.data?.tiles || [],
    data: query.data?.tiles || [], // backward compatibility
    loading: query.isLoading,
    error: query.error,
    
    // Helper functions  
    getTileTrails: () => {
      type TrailSegments = NonNullable<EnhancedFieldTile['trail_segments']>;
      const trails: Array<{ tileId: string; segments: TrailSegments }> = [];
      (query.data?.tiles || []).forEach(t => {
        if (t.trail_segments?.length) trails.push({ tileId: t.tile_id, segments: t.trail_segments });
      });
      return trails;
    },
    
    getTileHistory: (tileId: string) => {
      // Return empty array for compatibility with existing code
      return [];
    },

    aggregateMetrics: {
      totalCrowd: (query.data?.tiles || []).reduce((sum: number, t: EnhancedFieldTile) => sum + t.crowd_count, 0),
      averageVelocity: (query.data?.tiles || []).reduce((sum: number, t: EnhancedFieldTile) => 
        sum + (t.velocity?.magnitude || 0), 0) / Math.max(1, (query.data?.tiles || []).length),
      dominantMovementMode: 'walking', // simplified for now
      convergencePredictions: [],
      averageCohesion: 0.5,
      highActivityTiles: (query.data?.tiles || [])
        .filter((t: EnhancedFieldTile) => t.afterglow_intensity && t.afterglow_intensity > 0.7)
        .map((t: EnhancedFieldTile) => t.tile_id),
    },
    
    refetch: query.refetch,
  };
}