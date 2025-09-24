import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const ok = (b: unknown) => new Response(JSON.stringify(b), { headers: { ...CORS, 'content-type': 'application/json' } })
const bad = (m: string, c=400) => new Response(JSON.stringify({ error:m }), { status:c, headers: { ...CORS, 'content-type': 'application/json' } })

type Body = { flowId: string; sun_exposed_min?: number }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return bad('POST required', 405)

  let body: Body
  try { body = await req.json() } catch { return bad('invalid JSON', 422) }
  if (!body?.flowId) return bad('missing flowId', 422)
  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const supa = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } })

  const patch: Record<string, any> = { ended_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  if (Number.isFinite(body.sun_exposed_min)) patch.sun_exposed_min = Math.max(0, Math.floor(Number(body.sun_exposed_min)))

  const { error } = await supa.from('flows').update(patch).eq('id', body.flowId)
  if (error) return bad(error.message, 500)

  return ok({ summary: { ok: true, sun_exposed_min: patch.sun_exposed_min ?? null } })
})