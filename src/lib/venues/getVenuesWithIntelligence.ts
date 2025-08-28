// src/lib/venues/getVenuesWithIntelligence.ts
import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'

type Nearby = Database['public']['Functions']['get_nearby_venues']['Returns']
type Trending = Database['public']['Functions']['get_trending_venues_enriched']['Returns']

export type VenueIntel = {
  id: string
  name: string | null
  lat: number | null
  lng: number | null
  distance_m?: number | null
  trend_score?: number | null
}

export async function getVenuesWithIntelligence(args: {
  lat: number
  lng: number
  radius_m?: number
  city?: string | null
  limit?: number
}): Promise<VenueIntel[]> {
  const [{ data: near }, { data: trend }] = await Promise.all([
    supabase
      .rpc('get_nearby_venues', {
        lat: args.lat,
        lng: args.lng,
        radius_meters: args.radius_m ?? 1200,
        limit_count: args.limit ?? 40,
      })
      .returns<Nearby>(),
    args.city
      ? supabase
          .rpc('get_trending_venues_enriched', {
            city: args.city,
            limit_count: args.limit ?? 40,
          })
          .returns<Trending>()
      : Promise.resolve({ data: [] as Trending }),
  ])

  const byId = new Map<string, VenueIntel>()

  ;(near ?? []).forEach((n: any) => {
    byId.set(n.id, {
      id: n.id,
      name: n.name ?? null,
      lat: n.lat ?? null,
      lng: n.lng ?? null,
      distance_m: n.distance_m ?? null,
    })
  })

  ;(trend ?? []).forEach((t: any) => {
    const id = t.id ?? t.venue_id // support either shape
    const existing = byId.get(id)
    byId.set(id, {
      ...(existing ?? {
        id,
        name: t.name ?? null,
        lat: t.lat ?? null,
        lng: t.lng ?? null,
      }),
      trend_score: t.trend_score ?? null,
    })
  })

  return Array.from(byId.values())
}
