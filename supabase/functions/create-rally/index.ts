import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const

const ok = (b: unknown, ttl = 60) =>
  new Response(JSON.stringify(b), { headers: { ...CORS, 'content-type': 'application/json', 'cache-control': `public, max-age=${ttl}` } })

const bad = (m: string, c=400) =>
  new Response(JSON.stringify({ error: m }), { status: c, headers: { ...CORS, 'content-type': 'application/json' } })

type Body = {
  center: { lng: number; lat: number }
  venue_id?: string | null
  ttl_min?: number
  recipients?: string[] // profile_id[]
  note?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return bad('POST required', 405)

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } }
  )

  const { data: auth } = await supa.auth.getUser()
  const me = auth?.user?.id
  if (!me) return bad('not authenticated', 401)

  let body: Body
  try { body = await req.json() } catch { return bad('invalid JSON', 422) }
  
  // Fix coordinate validation to handle 0 values properly
  if (
    !body?.center ||
    typeof body.center.lng !== 'number' ||
    typeof body.center.lat !== 'number' ||
    !Number.isFinite(body.center.lng) ||
    !Number.isFinite(body.center.lat)
  ) {
    return bad('valid center {lng,lat} required', 422)
  }

  // Cooldowns (sender-only)
  const { data: recent } = await supa
    .from('rallies')
    .select('id,created_at')
    .eq('creator_id', me)
    .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .limit(1)
  if (recent?.length) return bad('cooldown', 429)

  const ttlMin = Math.max(15, Math.min(180, body.ttl_min ?? 60))
  const expires_at = new Date(Date.now() + ttlMin * 60 * 1000).toISOString()
  const geom = `SRID=4326;POINT(${body.center.lng} ${body.center.lat})`

  const { data: rally, error } = await supa
    .from('rallies')
    .insert({ creator_id: me, expires_at, center: geom as any, venue_id: body.venue_id ?? null, note: body.note ?? null })
    .select('id,expires_at')
    .single()

  if (error) return bad(error.message, 500)

  const recipients = Array.isArray(body.recipients) ? body.recipients.filter(Boolean) : []
  if (recipients.length) {
    // Use upsert to handle potential duplicates gracefully
    await supa.from('rally_invites')
      .upsert(recipients.map(to_profile => ({ rally_id: rally.id, to_profile })), { 
        onConflict: 'rally_id,to_profile',
        ignoreDuplicates: true 
      })
      .catch(() => {})
  }

  return ok({ rallyId: rally.id, expires_at: rally.expires_at, invited: recipients.length }, 10)
})