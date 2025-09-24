import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const ok = (b: unknown) => new Response(JSON.stringify(b), { headers: { ...CORS, 'content-type': 'application/json' } })
const bad = (m: string, c=400) => new Response(JSON.stringify({ error:m }), { status:c, headers: { ...CORS, 'content-type': 'application/json' } })

type Body = {
  flowId: string
  segment: {
    idx: number
    arrived_at?: string
    departed_at?: string
    center?: { lng: number; lat: number }
    venue_id?: string
    exposure_fraction?: number
    vibe_vector?: { energy?: number; valence?: number }
    weather_class?: string
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST')    return bad('POST required', 405)

  let body: Body
  try { body = await req.json() } catch { return bad('invalid JSON', 422) }
  if (!body?.flowId || typeof body.segment?.idx !== 'number') return bad('missing flowId or idx', 422)

  // Require center coordinates
  if (!body.segment?.center
      || !Number.isFinite(body.segment.center.lng)
      || !Number.isFinite(body.segment.center.lat)) {
    return bad('segment.center required', 422)
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const supa = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } })

  const arrived = body.segment.arrived_at ?? new Date().toISOString()
  const geom = `SRID=4326;POINT(${body.segment.center.lng} ${body.segment.center.lat})`

  const { error } = await supa.from('flow_segments').insert({
    flow_id: body.flowId,
    idx: body.segment.idx,
    arrived_at: arrived,
    departed_at: body.segment.departed_at ?? null,
    venue_id: body.segment.venue_id ?? null,
    center: geom as any, // always set (validated above)
    exposure_fraction: Math.max(0, Math.min(1, Number(body.segment.exposure_fraction ?? 0))),
    vibe_vector: body.segment.vibe_vector ?? {},
    weather_class: body.segment.weather_class ?? null,
  })
  if (error) return bad(error.message, 500)
  return ok({ ok: true })
})