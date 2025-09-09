import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ok = (body: unknown) => new Response(JSON.stringify(body), { 
  headers: { ...CORS, 'content-type': 'application/json' } 
})
const bad = (msg: string, code = 400) => new Response(JSON.stringify({ error: msg }), { 
  status: code, 
  headers: { ...CORS, 'content-type': 'application/json' } 
})

type TileVenue = {
  pid: string
  name: string
  category?: string | null
  open_now?: boolean | null
  busy_band?: 0|1|2|3|4
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return bad('POST required', 405)

  const { bbox, center, radius, filters } = await req.json()
  
  if (!bbox && !center) {
    return bad('bbox or center required')
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const supa = createClient(url, anon, { 
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } } 
  })

  try {
    // Fetch venues from RPC
    const { data: venuesRaw, error: venuesError } = await supa.rpc('search_venues_bbox', { 
      bbox_geojson: bbox ? {
        type: 'Polygon',
        coordinates: [[
          [bbox[0], bbox[1]], [bbox[2], bbox[1]], 
          [bbox[2], bbox[3]], [bbox[0], bbox[3]], 
          [bbox[0], bbox[1]]
        ]]
      } : null,
      center_lat: center?.[1],
      center_lng: center?.[0], 
      radius_m: radius || 1000
    })

    if (venuesError) throw venuesError

    // Get busy bands from flow segments (45min window)
    const sinceIso = new Date(Date.now() - 45 * 60 * 1000).toISOString()
    const [{ data: segAgg }, { data: friendAgg }] = await Promise.all([
      supa.rpc('get_venue_flow_counts', { since_timestamp: sinceIso }),
      // Load friend venue counts only if friendFlows filter is enabled
      (filters?.friendFlows
        ? (async () => {
            const { data: auth } = await supa.auth.getUser()
            const pid = auth?.user?.id
            if (!pid) return { data: [] as any[] }
            return await supa.rpc('recent_friend_venue_counts', { profile: pid, since: sinceIso })
          })()
        : Promise.resolve({ data: [] as any[] }))
    ])

    // Build count maps
    const counts = new Map<string, number>()
    ;(segAgg ?? []).forEach((r: any) => counts.set(r.venue_id, Number(r.count) || 0))
    
    const friendCounts = new Map<string, number>()
    ;(friendAgg ?? []).forEach((r: any) => friendCounts.set(r.venue_id, Number(r.friend_count) || 0))

    // Map to TileVenue format with busy bands
    let venues: TileVenue[] = (venuesRaw ?? []).map((v: any) => {
      const c = counts.get(v.id) ?? 0
      const band = c === 0 ? 0 : c === 1 ? 1 : c <= 3 ? 2 : c <= 6 ? 3 : 4
      return { 
        pid: v.id, 
        name: v.name, 
        category: v.category, 
        open_now: v.open_now ?? null, 
        busy_band: band 
      }
    })

    // Apply FriendFlows boost if enabled
    if (filters?.friendFlows) {
      venues.sort((a, b) => {
        const fa = friendCounts.get(a.pid) ?? 0
        const fb = friendCounts.get(b.pid) ?? 0
        if (fb !== fa) return fb - fa
        return (b.busy_band ?? 0) - (a.busy_band ?? 0)
      })
    }

    return ok({ venues, ttlSec: 60 })

  } catch (error) {
    console.error('[search-flow-venues] error:', error)
    return bad(error.message || 'Failed to search venues', 500)
  }
})