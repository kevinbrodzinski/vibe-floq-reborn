import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const

const ok = (b: unknown, ttl = 30) =>
  new Response(JSON.stringify(b), {
    headers: {
      ...CORS,
      'content-type': 'application/json',
      // cache both at edge & browser (feel free to tune)
      'cache-control': `public, s-maxage=${ttl}, max-age=${ttl}`,
      Vary: 'Authorization',
    },
  })

const bad = (m: string, c = 400) =>
  new Response(JSON.stringify({ error: m, code: c }), {
    status: c,
    headers: { ...CORS, 'content-type': 'application/json' },
  })

type Body = {
  bbox?: [number, number, number, number] // [W,S,E,N]
  center?: [number, number]               // [lng, lat]
  zoom?: number
  res?: number          // H3 override 7..11
  min_points?: number   // k-anon min
  limit_n?: number      // cap
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST')    return bad('POST required', 405)

  let body: Body
  try { body = await req.json() } catch { return bad('invalid JSON', 422) }

  const hasBbox   = Array.isArray(body.bbox)   && body.bbox.length === 4
  const hasCenter = Array.isArray(body.center) && body.center.length === 2
  if (!hasBbox && !hasCenter) return bad('bbox or center required', 422)

  // derive/normalize bbox with clamping
  let bbox: [number, number, number, number]
  if (hasBbox) {
    const [W,S,E,N] = body.bbox!
    const west  = Math.max(-180, Math.min(180, Math.min(W, E)))
    const east  = Math.max(-180, Math.min(180, Math.max(W, E)))
    const south = Math.max(-90, Math.min(90, Math.min(S, N)))
    const north = Math.max(-90, Math.min(90, Math.max(S, N)))
    bbox = [west, south, east, north]
  } else {
    const [lng, lat] = body.center!
    const clampedLng = Math.max(-180, Math.min(180, lng))
    const clampedLat = Math.max(-90, Math.min(90, lat))
    const radius = 900 // meters
    const deg    = radius / 111_000
    bbox = [clampedLng - deg, clampedLat - deg, clampedLng + deg, clampedLat + deg]
  }

  // zoom->base res + optional override
  const zoom     = Number.isFinite(body.zoom) ? Number(body.zoom) : 14
  const baseRes  = zoom >= 15 ? 10 : zoom >= 13 ? 9 : 8
  const res      = Number.isFinite(body.res)
    ? Math.max(7, Math.min(11, Math.floor(body.res!)))
    : baseRes

  const minPoints     = Math.max(3,  Math.min(50,  Math.floor(body.min_points ?? 3)))
  const limitN        = Math.max(1,  Math.min(200, Math.floor(body.limit_n   ?? 12)))
  const sinceMinutes  = 45

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!, // RPC is SECURITY DEFINER
    { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } }
  )

  try {
    const { data, error } = await supa.rpc('recent_convergence_secure', {
      west: bbox[0], south: bbox[1], east: bbox[2], north: bbox[3],
      since_minutes: sinceMinutes,
      res,
      min_points: minPoints,
      limit_n: limitN,
    })

    if (error) throw error

    // Defensive numeric coalescing
    const points = (data ?? []).map((r: any) => {
      const lng = Number(r.lng), lat = Number(r.lat)
      const groupMin = Number(r.group_min), prob = Number(r.prob), etaMin = Number(r.eta_min)
      // Filter out any malformed rows
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
      return {
        lng, lat,
        groupMin: Number.isFinite(groupMin) ? groupMin : 0,
        prob:     Number.isFinite(prob)     ? prob     : 0.25,
        etaMin:   Number.isFinite(etaMin)   ? etaMin   : 10,
      }
    }).filter(Boolean) as Array<{lng:number;lat:number;groupMin:number;prob:number;etaMin:number}>

    return ok({ points, ttlSec: 30 }, 30)
  } catch (e: any) {
    console.error('[detect-convergence]', e)
    return bad(e?.message ?? 'internal error', 500)
  }
})