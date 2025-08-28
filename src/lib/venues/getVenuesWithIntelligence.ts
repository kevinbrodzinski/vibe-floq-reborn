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
      .returns<Database['public']['Functions']['get_nearby_venues']['Returns']>(),
    args.city
      ? supabase
          .rpc('get_trending_venues_enriched', {
            city: args.city,
            limit_count: args.limit ?? 40,
          })
          .returns<Database['public']['Functions']['get_trending_venues_enriched']['Returns']>()
      : Promise.resolve({ data: [] as TrendingRet[] }),
  ])

  const byId = new Map<string, VenueIntel>()

  ;(near ?? []).forEach((n) => {
    byId.set(n.id, {
      id: n.id,
      name: (n as any).name ?? null,
      lat: (n as any).lat ?? null,
      lng: (n as any).lng ?? null,
      distance_m: (n as any).distance_m ?? null,
    })
  })
  ;(trend ?? []).forEach((t) => {
    const existing = byId.get(t.id)
    byId.set(t.id, {
      ...(existing ?? {
        id: t.id,
        name: (t as any).name ?? null,
        lat: (t as any).lat ?? null,
        lng: (t as any).lng ?? null,
      }),
      trend_score: (t as any).trend_score ?? null,
    })
  })

  return Array.from(byId.values())
}