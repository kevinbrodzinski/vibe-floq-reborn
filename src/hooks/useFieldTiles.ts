
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { viewportToTileIds } from '@/lib/geo'
import type { FieldTile } from '@/types/field'

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

  console.log('[FIELD_TILES] Hook called with bounds:', bounds);
  console.log('[FIELD_TILES] Generated tile IDs:', tileIds);

  return useQuery({
    queryKey: ['field-tiles', tileIds],
    queryFn: async (): Promise<FieldTile[]> => {
      if (!tileIds.length) {
        return []
      }
      
      const { data, error } = await supabase.functions.invoke('get_field_tiles', {
        body: { tile_ids: tileIds }
      })

      if (error) {
        console.error('[FIELD_TILES] Error from edge function:', error);
        // Don't throw raw Response object - extract safe primitives
        const safeError = { 
          status: error.status, 
          message: typeof error.text === 'function' ? await error.text() : error.message ?? error 
        };
        throw safeError;
      }
      
      console.log('[FIELD_TILES] Response data:', data);
      
      // Handle the response structure from the edge function
      const tiles = data?.tiles || []
      
      // Transform the data to match our FieldTile interface
      return tiles.map((tile: any): FieldTile => ({
        tile_id: tile.tile_id,
        crowd_count: tile.crowd_count || 0,
        avg_vibe: tile.avg_vibe || { h: 0, s: 0, l: 0 },
        active_floq_ids: tile.active_floq_ids || [],
        updated_at: tile.updated_at
      }))
    },
    enabled: tileIds.length > 0,
    staleTime: 30_000, // 30 seconds - aligns with refresh interval
  })
}
