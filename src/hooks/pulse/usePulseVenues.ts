import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { NearbyVenue, TrendingVenueDB } from '@/types/pulse'
import type { Database } from '@/integrations/supabase/types'

type NearbyReturns = Database['public']['Functions']['get_nearby_venues']['Returns']
type TrendingReturns = Database['public']['Functions']['get_trending_venues_enriched']['Returns']

export const usePulseNearbyVenues = (args: {
  lat: number
  lng: number
  radiusKm: number
  limit?: number
  pillKeys?: string[]
}) => {
  const { lat, lng, radiusKm, limit = 50, pillKeys = [] } = args
  
  return useQuery<NearbyVenue[]>({
    queryKey: ['venues:pulse:nearby', lat, lng, radiusKm, limit, pillKeys],
    enabled: Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0,
    staleTime: 5 * 60_000, // 5 minutes
    queryFn: async (): Promise<NearbyVenue[]> => {
      const radiusM = Math.round(radiusKm * 1000)
      const anyTags = pillKeys.length ? pillKeys : null
      
      const { data, error } = await supabase
        .rpc('get_nearby_venues', {
          p_lat: lat,
          p_lng: lng,
          p_radius_m: radiusM,
          p_limit: limit,
          p_any_tags: anyTags,
          p_all_tags: null
        })
        
      if (error) throw error
      return (data ?? []) as NearbyVenue[]
    }
  })
}

export const usePulseTrendingVenues = (args: { 
  lat: number
  lng: number
  radiusM: number
  limit?: number 
  pillKeys?: string[]
}) => {
  const { lat, lng, radiusM, limit = 15, pillKeys = [] } = args
  
  return useQuery<TrendingVenueDB[]>({
    queryKey: ['venues:pulse:trending', lat, lng, radiusM, limit, pillKeys],
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
    staleTime: 5 * 60_000, // 5 minutes
    queryFn: async (): Promise<TrendingVenueDB[]> => {
      // Try enhanced RPC with pill-based filtering first
      if (pillKeys.length > 0) {
        try {
          const { data, error } = await supabase
            .rpc("get_trending_venues_enriched", {
              p_lat: lat,
              p_lng: lng,
              p_radius_m: radiusM,
              p_limit: limit,
              p_any_tags: pillKeys,
              p_all_tags: []
            })
          
          if (error) throw error
          return (data || []) as TrendingVenueDB[]
        } catch (err) {
          console.warn('Enhanced trending venues failed:', err)
          // Fall back to basic query
        }
      }
      
      // Default to basic trending query
      const { data, error } = await supabase
        .rpc("get_trending_venues_enriched", {
          p_lat: lat,
          p_lng: lng,
          p_radius_m: radiusM,
          p_limit: limit,
          p_any_tags: [],
          p_all_tags: []
        })
        
      if (error) throw error
      return (data || []) as TrendingVenueDB[]
    }
  })
}