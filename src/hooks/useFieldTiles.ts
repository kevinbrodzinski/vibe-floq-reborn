import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

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

export function useFieldTiles(bounds: TileBounds) {
  return useQuery({
    queryKey: ['field-tiles', bounds],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-field-tiles', {
        body: {
          min_lat: bounds.minLat,
          max_lat: bounds.maxLat,
          min_lng: bounds.minLng,
          max_lng: bounds.maxLng,
          precision: bounds.precision || 6
        }
      })

      if (error) throw error
      return data as FieldTile[]
    },
    enabled: !!(bounds.minLat && bounds.maxLat && bounds.minLng && bounds.maxLng),
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // 1 minute
  })
}
