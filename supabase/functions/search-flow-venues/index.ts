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
    // Compute bbox from center if needed
    const bbox = hasBbox ? body.bbox! : (() => {
      const [lng, lat] = body.center!
      const deg = radius / 111_000
      return [lng - deg, lat - deg, lng + deg, lat + deg] as [number,number,number,number]
    })()

    // RPC search_venues_bbox (assumes your SQL view handles geometry)
    const { data: venuesRaw, error: venuesError } = await supa.rpc('search_venues_bbox', {
      bbox_geojson: {
        type: 'Polygon',
        coordinates: [[
          [bbox[0], bbox[1]],[bbox[2], bbox[1]],
          [bbox[2], bbox[3]],[bbox[0], bbox[3]],
          [bbox[0], bbox[1]],
        ]]
      },
      center_lat: hasCenter ? body.center![1] : null,
      center_lng: hasCenter ? body.center![0] : null,
      radius_m: radius
    })
    if (venuesError) throw venuesError

    // Flow activity (45 min window)
    const sinceIso = new Date(Date.now() - 45 * 60 * 1000).toISOString()
    const [{ data: segAgg }, { data: friendAgg }] = await Promise.all([
      supa.rpc('get_venue_flow_counts', { since_timestamp: sinceIso }),
      (filters.friendFlows
        ? (async () => {
            const { data: auth } = await supa.auth.getUser()
            const pid = auth?.user?.id
            if (!pid) return { data: [] as any[] }
            return await supa.rpc('recent_friend_venue_counts', { profile: pid, since: sinceIso })
          })()
        : Promise.resolve({ data: [] as any[] }))
    ])

    const counts       = new Map<string, number>()
    const friendCounts = new Map<string, number>()
    ;(segAgg     ?? []).forEach((r: any) => counts.set(String(r.venue_id), Number(r.count) || 0))
    ;(friendAgg  ?? []).forEach((r: any) => friendCounts.set(String(r.venue_id), Number(r.friend_count) || 0))

    type TileVenue = { pid: string; name: string; category?: string|null; open_now?: boolean|null; busy_band?: 0|1|2|3|4 }
    let venues: TileVenue[] = (venuesRaw ?? []).map((v: any) => {
      const c = counts.get(String(v.id)) ?? 0
      const band: 0|1|2|3|4 = (c === 0 ? 0 : c === 1 ? 1 : c <= 3 ? 2 : c <= 6 ? 3 : 4)
      return {
        pid: String(v.id),
        name: String(v.name ?? ''),
        category: v.category ?? null,
        open_now: v.open_now ?? null,
        busy_band: band,
      }
    })

    // Apply sorting boosts
    if (filters.friendFlows) {
      venues.sort((a, b) => {
        const fa = friendCounts.get(a.pid) ?? 0
        const fb = friendCounts.get(b.pid) ?? 0
        if (fb !== fa) return fb - fa
        // tie-breakers to reduce flicker:
        if ((b.busy_band ?? 0) !== (a.busy_band ?? 0)) return (b.busy_band ?? 0) - (a.busy_band ?? 0)
        return a.name.localeCompare(b.name)
      })
    }

    // Simple boost: outdoor categories first when sun is on
    const wantsSun = Array.isArray(filters?.weatherPref) && filters!.weatherPref!.includes('sun')
    if (wantsSun) {
      const outdoor = new Set(['patio','beer garden','rooftop','outdoor','park','beach'])
      const score = (v: TileVenue) => {
        const cat = (v.category || '').toString().toLowerCase()
        let s = 0
        outdoor.forEach(k => { if (cat.includes(k)) s += 1 })
        // blend busy band a bit to avoid empty spots
        s += (v.busy_band ?? 0) * 0.1
        return s
      }
      venues.sort((a, b) => {
        const sa = score(a), sb = score(b)
        if (sb !== sa) return sb - sa
        return a.name.localeCompare(b.name)
      })
    }

    return ok({ venues, ttlSec: 60 })
  } catch (error: any) {
    console.error('[search-flow-venues] error:', error)
    return bad(error?.message || 'Failed to search venues', 500)
  }
})