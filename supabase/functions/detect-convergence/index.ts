// supabase/functions/detect-convergence/index.ts
// Calls recent_convergence_secure (SECURITY DEFINER) for privacy-safe centroids.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const

const ok = (b: unknown, ttl = 30) =>
  new Response(JSON.stringify(b), {
    headers: { ...CORS, 'content-type': 'application/json', 'cache-control': `public, max-age=${ttl}` },
  })

const bad = (m: string, c = 400) =>
  new Response(JSON.stringify({ error: m }), {
    status: c,
    headers: { ...CORS, 'content-type': 'application/json' },
  })

type Body = {
  bbox?: [number, number, number, number]
  center?: [number, number]
  zoom?: number
  /** optional H3 resolution override (7..11) */
  res?: number
  /** optional k-anon minimum */
  min_points?: number
  /** optional hard limit */
  limit_n?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return bad('POST required', 405)

  let body: Body
  try {
    body = await req.json()
  } catch {
    return bad('invalid JSON', 422)
  }

  const hasBbox = Array.isArray(body.bbox) && body.bbox.length === 4
  const hasCenter = Array.isArray(body.center) && body.center.length === 2
  if (!hasBbox && !hasCenter) return bad('bbox or center required', 422)

  // Derive a bbox from center if not provided (rough meter→deg)
  let bbox: [number, number, number, number]
  if (hasBbox) {
    bbox = body.bbox!
  } else {
    const [lng, lat] = body.center!
    const radius = 900 // meters (matches client default)
    const deg = radius / 111_000
    bbox = [lng - deg, lat - deg, lng + deg, lat + deg]
  }

  // Map zoom → base H3 res, then apply optional override
  const zoom = typeof body.zoom === 'number' ? body.zoom : 14
  const baseRes = zoom >= 15 ? 10 : zoom >= 13 ? 9 : 8
  const res =
    typeof body.res === 'number'
      ? Math.max(7, Math.min(11, Math.floor(body.res)))
      : baseRes

  const minPoints = Math.max(3, Math.min(50, Math.floor(body.min_points ?? 3))) // keep k-anon ≥ 3
  const limitN = Math.max(1, Math.min(200, Math.floor(body.limit_n ?? 12)))
  const sinceMinutes = 45

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!, // secure RPC is SECURITY DEFINER; anon is fine
    { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } }
  )

  try {
    const { data, error } = await supa.rpc('recent_convergence_secure', {
      west: bbox[0],
      south: bbox[1],
      east: bbox[2],
      north: bbox[3],
      since_minutes: sinceMinutes,
      res,
      min_points: minPoints,
      limit_n: limitN,
    })

    if (error) throw error

    // Shape to client contract
    const points =
      (data ?? []).map((r: any) => ({
        lng: Number(r.lng),
        lat: Number(r.lat),
        groupMin: Number(r.group_min),
        prob: Number(r.prob),
        etaMin: Number(r.eta_min),
      })) ?? []

    return ok({ points, ttlSec: 30 })
  } catch (e: any) {
    console.error('[detect-convergence]', e)
    return bad(e?.message ?? 'internal error', 500)
  }
})