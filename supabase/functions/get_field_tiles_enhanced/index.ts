// supabase/functions/get_field_tiles_enhanced/index.ts
// Privacy-aware field tiles fetch with k-anon, optional history, and friendship-scoped ids.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Configs ─────────────────────────────────────────────────────────────────────
const MAX_TILE_IDS = 250
const MAX_HISTORY = 10
const K_MIN = 5 // k-anonymity floor

// ── CORS helpers ────────────────────────────────────────────────────────────────
const CORS_BASE = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function corsHeadersFor(req: Request) {
  // if you need per-origin, adjust here
  return CORS_BASE
}
function handlePreflight(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeadersFor(req) })
  }
  return null
}

// ── Friendship cache (lightweight) ─────────────────────────────────────────────
async function getFriendSets(supa: any, viewerId: string) {
  // Adjust to your friendships schema; this assumes:
  // friendships(profile_low, profile_high, friend_state='accepted', is_close bool)
  const { data, error } = await supa
    .from('friendships')
    .select('profile_low, profile_high, is_close')
    .or(`profile_low.eq.${viewerId},profile_high.eq.${viewerId}`)
    .eq('friend_state', 'accepted')

  if (error) {
    console.warn('[getFriendSets] error:', error)
    return { close: new Set<string>(), friends: new Set<string>() }
  }
  const friends = new Set<string>()
  const close = new Set<string>()
  for (const r of (data ?? [])) {
    const other = r.profile_low === viewerId ? r.profile_high : r.profile_low
    friends.add(other)
    if (r.is_close) close.add(other)
  }
  return { close, friends }
}

// ── Handler ────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const pf = handlePreflight(req)
  if (pf) return pf
  const headers = { ...corsHeadersFor(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    )

    // who
    const { data: viewerRes } = await supabase.auth.getUser()
    const viewerId: string | null = viewerRes?.user?.id ?? null

    // body
    const body = await req.json().catch(() => ({}))
    const tile_ids: string[] = Array.isArray(body.tile_ids) ? body.tile_ids.slice(0, MAX_TILE_IDS) : []
    const include_history: boolean = !!body.include_history
    const time_window_seconds: number = Number.isFinite(body.time_window_seconds) ? body.time_window_seconds : 300

    if (tile_ids.length === 0) {
      return new Response(JSON.stringify({ tiles: [] }), { headers, status: 200 })
    }

    const sinceIso = new Date(Date.now() - time_window_seconds * 1000).toISOString()

    // friendship (scoping active_floq_ids if they are profile IDs)
    const relSets = viewerId ? await getFriendSets(supabase, viewerId) : { close: new Set<string>(), friends: new Set<string>() }

    // fetch latest snapshots (and, if you actually keep history rows in this same table, the newer ones)
    const { data, error } = await supabase
      .from('field_tiles')
      .select('tile_id,crowd_count,avg_vibe,active_floq_ids,updated_at,centroid')
      .in('tile_id', tile_ids)
      .gte('updated_at', sinceIso)
    if (error) throw error

    // Group by tile id
    const byId = new Map<string, any[]>()
    for (const r of data ?? []) {
      const arr = byId.get(r.tile_id)
      if (arr) arr.push(r)
      else byId.set(r.tile_id, [r])
    }
    // newest first per tile
    for (const arr of byId.values()) {
      arr.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    }

    // Build response in the same order as requested tile_ids
    const tiles = tile_ids.map((id) => {
      const arr = byId.get(id) ?? []
      const curr = arr[0]
      if (!curr) return null

      const underK = (curr.crowd_count ?? 0) < K_MIN

      // history (only if there really are multiple rows for that tile)
      let history: Array<{ timestamp: string; crowd_count: number; centroid: { lat: number; lng: number }; vibe?: any }> | undefined
      if (include_history && !underK && arr.length > 1) {
        history = arr.slice(0, MAX_HISTORY).map((r) => ({
          timestamp: r.updated_at,
          crowd_count: r.crowd_count ?? 0,
          centroid: parseCentroid(r),
          vibe: r.avg_vibe ?? null,
        }))
      }

      // velocity from two newest points in history
      let velocity: ReturnType<typeof velocityFromSamples> | undefined
      if (history && history.length >= 2) {
        velocity = velocityFromSamples(history[0], history[1])
      }

      // active_floq_ids scoped to friends/close
      let active_floq_ids: string[] = []
      const allIds: string[] = curr.active_floq_ids ?? []
      // Only attempt to filter if those ids are known profile ids; otherwise, skip
      if (!underK && viewerId && Array.isArray(allIds) && allIds.length) {
        active_floq_ids = allIds.filter((pid) => relSets.close.has(pid) || relSets.friends.has(pid))
      }

      // afterglow intensity (freshness x crowd norm)
      const ageSec = Math.max(0, (Date.now() - new Date(curr.updated_at).getTime()) / 1000)
      const freshness = Math.max(0, 1 - ageSec / 60)
      const crowdNorm = Math.min(1, (curr.crowd_count ?? 0) / 50)
      const afterglow_intensity = freshness * crowdNorm

      const centroid = parseCentroid(curr)
      const speed = velocity?.magnitude ?? 0
      const movement_mode = movementFromSpeed(speed)

      return {
        tile_id: curr.tile_id,
        crowd_count: curr.crowd_count ?? 0,
        avg_vibe: curr.avg_vibe ?? null, // {h,s,l} | null
        active_floq_ids,
        updated_at: curr.updated_at,
        centroid,
        velocity,
        movement_mode,
        history,                   // or undefined when not available
        momentum: undefined,       // computed client/worker-side
        cohesion_score: undefined, // computed client/worker-side
        convergence_vector: null,  // computed in pixel space by renderer/worker
        afterglow_intensity,
        trail_segments: [],        // your renderer can fill these from history if desired
      }
    }).filter(Boolean)

    return new Response(JSON.stringify({ tiles }), { headers, status: 200 })
  } catch (e) {
    console.error('[get_field_tiles_enhanced]', e)
    return new Response(JSON.stringify({ tiles: [], error: 'internal' }), { headers, status: 500 })
  }
})

// ── Utils ──────────────────────────────────────────────────────────────────────
function parseCentroid(row: any): { lat: number; lng: number } {
  const c = row?.centroid
  // GeoJSON string
  if (typeof c === 'string') {
    try {
      const g = JSON.parse(c)
      if (g?.type === 'Point' && Array.isArray(g.coordinates) && isFinite(g.coordinates[0]) && isFinite(g.coordinates[1])) {
        return { lng: g.coordinates[0], lat: g.coordinates[1] }
      }
    } catch {}
  }
  // GeoJSON object
  if (c?.type === 'Point' && Array.isArray(c.coordinates) && isFinite(c.coordinates[0]) && isFinite(c.coordinates[1])) {
    return { lng: c.coordinates[0], lat: c.coordinates[1] }
  }
  // x/y object
  if (isFinite(c?.x) && isFinite(c?.y)) return { lat: c.y, lng: c.x }
  return { lat: 0, lng: 0 }
}

function velocityFromSamples(curr: any, prev: any) {
  const t1 = new Date(curr.timestamp).getTime()
  const t0 = new Date(prev.timestamp).getTime()
  const dt = (t1 - t0) / 1000
  if (dt <= 0) return undefined

  const c1 = curr.centroid, c0 = prev.centroid
  if (![c1?.lat, c1?.lng, c0?.lat, c0?.lng].every(isFinite)) return undefined

  const dx = (c1.lng - c0.lng) * 111320 * Math.cos((c1.lat * Math.PI) / 180)
  const dy = (c1.lat - c0.lat) * 111320
  const vx = dx / dt
  const vy = dy / dt
  const magnitude = Math.sqrt(vx * vx + vy * vy)
  const heading = Math.atan2(vx, vy) // radians
  return { vx, vy, magnitude, heading, confidence: 0.8 }
}

function movementFromSpeed(speed: number): string {
  if (!isFinite(speed) || speed < 0) return 'stationary'
  if (speed < 0.5) return 'stationary'
  if (speed <= 2) return 'walking'
  if (speed <= 8) return 'cycling'
  if (speed <= 30) return 'driving'
  return 'transit'
}