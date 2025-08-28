import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'

type NearbyRet = Database['public']['Functions']['get_nearby_venues']['Returns'][number]
type TrendingRet = Database['public']['Functions']['get_trending_venues_enriched']['Returns'][number]

export type VenueIntel = {
  id: string
  name: string | null
  lat: number | null
  lng: number | null
  distance_m?: number | null
  trend_score?: number | null
  popularity?: number | null
  category?: string | null
}

export async function getVenuesWithIntelligence(args: { 
  lat: number; 
  lng: number; 
  radius_m?: number; 
  city?: string; 
  limit?: number; 
}) {
  const [{ data: near }, { data: trend }] = await Promise.all([
    supabase.rpc('get_nearby_venues', {
      p_lat: args.lat, 
      p_lng: args.lng, 
      p_radius_m: args.radius_m ?? 1200, 
      p_limit: args.limit ?? 40
    }).returns<Database['public']['Functions']['get_nearby_venues']['Returns']>(),
    args.city
      ? supabase.rpc('get_trending_venues_enriched', { 
          p_lat: args.lat,
          p_lng: args.lng,
          p_radius_m: args.radius_m ?? 1200,
          p_limit: args.limit ?? 40 
        }).returns<Database['public']['Functions']['get_trending_venues_enriched']['Returns']>()
      : Promise.resolve({ data: [] as TrendingRet[] })
  ])

  const byId = new Map<string, VenueIntel>()
  
  // Process nearby venues
  ;(near ?? []).forEach(n => {
    const venue = n as any;
    byId.set(venue.id, { 
      id: venue.id, 
      name: venue.name ?? null, 
      lat: venue.lat ?? null, 
      lng: venue.lng ?? null, 
      distance_m: venue.distance_m ?? null,
      popularity: venue.popularity ?? null,
      category: venue.category ?? null
    })
  })
  
  // Merge trending data
  ;(trend ?? []).forEach(t => {
    const venue = t as any;
    const existing = byId.get(venue.id)
    byId.set(venue.id, { 
      ...(existing ?? { 
        id: venue.id, 
        name: venue.name ?? null, 
        lat: venue.lat ?? null, 
        lng: venue.lng ?? null 
      }), 
      trend_score: venue.trend_score ?? null 
    })
  })
  
  return Array.from(byId.values())
}