import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const

const ok  = (b: unknown)          => new Response(JSON.stringify(b), { headers: { ...CORS, 'content-type': 'application/json' } })
const bad = (m: string, c=400)    => new Response(JSON.stringify({ error:m }), { status:c, headers: { ...CORS, 'content-type': 'application/json' } })

type Body = {
  visibility?: 'owner'|'friends'|'public'
  start_center?: { lng: number; lat: number }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST')    return bad('POST required', 405)

  let body: Body
  try { body = await req.json() } catch { return bad('invalid JSON', 422) }

  const url  = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const supa = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } })

  const { data: auth } = await supa.auth.getUser()
  const pid = auth?.user?.id
  if (!pid) return bad('not authenticated', 401)

  const visibility = (['owner','friends','public'] as const).includes((body.visibility as any)) ? body.visibility : 'owner'
  const geom = (body.start_center && Number.isFinite(body.start_center.lng) && Number.isFinite(body.start_center.lat))
    ? `SRID=4326;POINT(${body.start_center.lng} ${body.start_center.lat})`
    : null

  const { data, error } = await supa
    .from('flows')
    .insert({ profile_id: pid, visibility, start_location: geom as any })
    .select('id')
    .single()

  if (error) return bad(error.message, 500)
  return ok({ flowId: data!.id })
})