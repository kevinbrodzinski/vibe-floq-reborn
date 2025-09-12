import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const

const ok = (b: unknown, ttl = 30) => 
  new Response(JSON.stringify(b), { headers: { ...CORS, 'content-type': 'application/json', 'cache-control': `public, max-age=${ttl}` } })

const bad = (m: string, c = 400) => 
  new Response(JSON.stringify({ error: m }), { status: c, headers: { ...CORS, 'content-type': 'application/json' } })

type Body = {
  rallyId: string
  title: string
  participants: string[]
  centroid?: { lng: number; lat: number } | null
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
  if (!body?.rallyId || !Array.isArray(body.participants)) return bad('rallyId + participants required', 422)

  // Create thread
  const { data: thread, error: tErr } = await supa
    .from('rally_threads')
    .insert({
      rally_id: body.rallyId,
      title: body.title ?? 'Rally',
      participants: body.participants,
      centroid: body.centroid ?? null
    })
    .select('id')
    .single()

  if (tErr) return bad(tErr.message, 500)

  // First system message
  const { error: mErr } = await supa
    .from('rally_messages')
    .insert({
      thread_id: thread.id,
      kind: 'system',
      body: 'Rally started — inviting nearby friends.',
    })

  if (mErr) return bad(mErr.message, 500)

  return ok({ threadId: thread.id })
})