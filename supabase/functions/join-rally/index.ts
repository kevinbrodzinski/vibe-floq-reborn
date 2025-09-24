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

type Body = { rallyId: string; status: 'joined'|'declined' }

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
  if (!body?.rallyId || !['joined','declined'].includes(body.status)) return bad('invalid payload', 422)

  const { data: invite } = await supa
    .from('rally_invites')
    .select('rally_id,to_profile')
    .eq('rally_id', body.rallyId).eq('to_profile', me).maybeSingle()

  if (!invite) {
    await supa.from('rally_invites').insert({ rally_id: body.rallyId, to_profile: me }).catch(()=>{})
  }

  const { error } = await supa
    .from('rally_invites')
    .update({ status: body.status, responded_at: new Date().toISOString() })
    .eq('rally_id', body.rallyId).eq('to_profile', me)
  if (error) return bad(error.message, 500)

  return ok({ ok: true })
})