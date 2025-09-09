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
    arrived_at: string
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
  if (req.method !== 'POST') return bad('POST required', 405)

  const body = await req.json() as Body
  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const supa = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } })

  // RLS will enforce ownership
  const geom = body.segment.center
    ? `SRID=4326;POINT(${body.segment.center.lng} ${body.segment.center.lat})`
    : null

  const { error } = await supa.from('flow_segments').insert({
    flow_id: body.flowId,
    idx: body.segment.idx,
    arrived_at: body.segment.arrived_at,
    departed_at: body.segment.departed_at ?? null,
    venue_id: body.segment.venue_id ?? null,
    center: geom ? (geom as any) : null,
    exposure_fraction: body.segment.exposure_fraction ?? 0,
    vibe_vector: body.segment.vibe_vector ?? {},
    weather_class: body.segment.weather_class ?? null
  })
  if (error) return bad(error.message, 500)
  return ok({ ok: true })
})