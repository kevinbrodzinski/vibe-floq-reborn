import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { supaFn } from '@/lib/supaFn';
import { viewportToTileIds } from '@/lib/geo';
import { deterministicRandom } from '@/utils/djb2Hash';
import type { FieldTile } from '@/types/field';

interface TileBounds {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
  precision?: number
}

export function useFieldTiles(bounds?: TileBounds) {
  // Convert bounds to tile IDs to match edge function API
  const tileIds = bounds ? viewportToTileIds(
    bounds.minLat,
    bounds.maxLat,
    bounds.minLng,
    bounds.maxLng,
    bounds.precision ?? 6
  ).sort() : []; // stable cache key


  return useQuery({
    queryKey: ['field-tiles', tileIds],
    queryFn: async (): Promise<FieldTile[]> => {
      if (!tileIds.length) return [];
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("No auth session");
        
        const res = await supaFn('get_field_tiles', session.access_token, { 
          tile_ids: tileIds 
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('[FIELD_TILES] invoke err', {
            message: errorText,
            status: res.status,
          });
          throw new Error('field_tiles invoke failed');
        }
        
        const data = await res.json();
        // Handle the response structure from the edge function
        const tiles = data?.tiles || [];
        
        // Transform the data to match our FieldTile interface
        return tiles.map((tile: any): FieldTile => ({
          tile_id: tile.tile_id,
          crowd_count: tile.crowd_count || 0,
          avg_vibe: tile.avg_vibe || { h: 0, s: 0, l: 0 },
          active_floq_ids: tile.active_floq_ids || [],
          updated_at: tile.updated_at
        }))
      } catch (error) {
        console.warn('[FIELD_TILES] Failed to fetch real tiles, using mock data', error);
        
        // Generate deterministic mock field tiles for debugging
        return tileIds.map((tileId): FieldTile => ({
          tile_id: tileId,
          crowd_count: Math.floor(deterministicRandom(tileId, 1) * 20) + 3, // 3-22 people per tile
          avg_vibe: {
            h: Math.floor(deterministicRandom(tileId, 2) * 360), // Deterministic hue
            s: 0.7 + (deterministicRandom(tileId, 3) * 0.3), // 70-100% saturation
            l: 0.5 + (deterministicRandom(tileId, 4) * 0.2)  // 50-70% lightness
          },
          active_floq_ids: [], // Include empty array for mock data
          updated_at: new Date().toISOString()
        }));
      }
    },
    enabled: !!tileIds.length,
    staleTime: 30_000, // 30 seconds - aligns with refresh interval
  })
}