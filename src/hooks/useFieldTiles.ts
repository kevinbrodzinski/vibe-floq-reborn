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

  return useQuery({
    queryKey: ['field-tiles', tileIds],
    queryFn: async () => {
      if (!tileIds.length) return []
      
      const { data, error } = await supabase.functions.invoke('get-field-tiles', {
        body: { tile_ids: tileIds }
      })

      if (error) throw error
      return data as FieldTile[]
    },
    enabled: tileIds.length > 0,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // 1 minute
  })
}