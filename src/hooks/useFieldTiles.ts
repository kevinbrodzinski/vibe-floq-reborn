
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { viewportToTileIds } from '@/lib/geo'

interface TileBounds {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
  precision?: number
}

interface FieldTile {
  id: string
  geo: string
  properties: Record<string, any>
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

  // Debug logging
  console.log('[FIELD_TILES] Hook called with:', {
    bounds,
    tileIds,
    tileCount: tileIds.length
  })

  return useQuery({
    queryKey: ['field-tiles', tileIds],
    queryFn: async () => {
      if (!tileIds.length) {
        console.log('[FIELD_TILES] No tile IDs, returning empty array')
        return []
      }
      
      console.log('[FIELD_TILES] Fetching tiles for IDs:', tileIds)
      
      const { data, error } = await supabase.functions.invoke('get_field_tiles', {
        body: { tile_ids: tileIds }
      })

      if (error) {
        console.error('[FIELD_TILES] Error fetching tiles:', error)
        throw error
      }
      
      console.log('[FIELD_TILES] Received tiles:', data)
      return data as FieldTile[]
    },
    enabled: tileIds.length > 0,
    staleTime: 10_000, // 10 seconds - shorter for debugging
    refetchInterval: 30_000, // 30 seconds
  })
}
