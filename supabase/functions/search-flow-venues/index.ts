import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const ok  = (b: unknown) => new Response(JSON.stringify(b), { headers: { ...CORS, 'content-type': 'application/json' } })
const bad = (m: string, c=400) => new Response(JSON.stringify({ error:m }), { status:c, headers: { ...CORS, 'content-type': 'application/json' } })

type Filters = {
  friendFlows?: boolean
  weatherPref?: string[]
}
type Body = {
  bbox?: [number,number,number,number]
  center?: [number,number]
  radius?: number
  filters?: Filters
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST')    return bad('POST required', 405)

  let body: Body
  try { body = await req.json() } catch { return bad('invalid JSON', 422) }

  const hasBbox   = Array.isArray(body.bbox)   && body.bbox.length === 4
  const hasCenter = Array.isArray(body.center) && body.center.length === 2
  if (!hasBbox && !hasCenter) return bad('bbox or center required', 422)

  const radius = Math.max(50, Math.min(5000, Number(body.radius ?? 1000))) // clamp 50..5000m
  const filters: Filters = (typeof body.filters === 'object' && body.filters) ? body.filters : {}

  const url  = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const supa = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } })

  try {
    // Extract filter preferences
    const sinceMinutes = 45
    const wantsSun = Array.isArray(filters?.weatherPref) && filters!.weatherPref!.includes('sun')
    const includeFriend = !!filters?.friendFlows

    // Single enriched RPC call - handles search + count + boost + sort server-side
    const { data, error } = await supa.rpc('search_flow_venues_enriched', {
      bbox_geojson: hasBbox ? {
        type: 'Polygon',
        coordinates: [[[body.bbox![0],body.bbox![1]],[body.bbox![2],body.bbox![1]],[body.bbox![2],body.bbox![3]],[body.bbox![0],body.bbox![3]],[body.bbox![0],body.bbox![1]]]]
      } : null,
      center_lat: hasCenter ? body.center![1] : null,
      center_lng: hasCenter ? body.center![0] : null,
      radius_m: radius,
      since_minutes: sinceMinutes,
      include_friend_boost: includeFriend,
      wants_sun: wantsSun,
      limit_n: 200
    })
    if (error) throw error

    // Map to TileVenue format
    type TileVenue = { pid: string; name: string; category?: string|null; busy_band?: 0|1|2|3|4 }
    const venues: TileVenue[] = (data ?? []).map((v: any) => ({
      pid: String(v.id),
      name: String(v.name ?? ''),
      category: v.category ?? null,
      busy_band: v.busy_band as 0|1|2|3|4,
    }))

    return ok({ venues, ttlSec: 60 })
  } catch (error: any) {
    console.error('[search-flow-venues] error:', error)
    return bad(error?.message || 'Failed to search venues', 500)
  }
})