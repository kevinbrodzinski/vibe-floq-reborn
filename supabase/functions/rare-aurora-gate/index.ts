// supabase/functions/rare-aurora-gate/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const ok = (body: unknown, ttlSec=60) => new Response(JSON.stringify(body), {
  headers: { ...corsHeaders, 'content-type':'application/json; charset=utf-8', 'cache-control': `public, max-age=${ttlSec}` }
})
const bad = (msg: string, code=400) => new Response(JSON.stringify({ error: msg }), {
  status: code, headers: { ...corsHeaders, 'content-type':'application/json' }
})

// in-memory fallback
const mem = new Map<string, number>()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST')    return bad('POST required', 405)

  const WEEK = 7*24*3600*1000
  try {
    const url  = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization')! } } })

    let key = ''
    try { key = (await supabase.auth.getUser()).data.user?.id ?? '' } catch {}
    if (!key) key = req.headers.get('x-forwarded-for') ?? 'anon'
    const kvKey = `rare_aurora:${key}`

    // Try Postgres KV first
    try {
      const { data } = await supabase.from('kv_flags').select('key, updated_at').eq('key', kvKey).maybeSingle()
      const now = Date.now()
      if (data?.updated_at) {
        const last = Date.parse(data.updated_at)
        if (now - last < WEEK) {
          return ok({ allow: false, ttlSec: Math.ceil((WEEK - (now-last))/1000) }, 60)
        }
        // update timestamp
        await supabase.from('kv_flags').update({ updated_at: new Date().toISOString() }).eq('key', kvKey)
        return ok({ allow: true, ttlSec: WEEK/1000 }, 60)
      } else {
        await supabase.from('kv_flags').insert({ key: kvKey, value: {} })
        return ok({ allow: true, ttlSec: WEEK/1000 }, 60)
      }
    } catch {
      // fallback to in-memory gate
      const now = Date.now()
      const last = mem.get(kvKey) ?? 0
      if (now - last < WEEK) return ok({ allow: false, ttlSec: Math.ceil((WEEK-(now-last))/1000) }, 60)
      mem.set(kvKey, now); return ok({ allow: true, ttlSec: WEEK/1000 }, 60)
    }
  } catch (e) {
    // be permissive if an error occurs
    return ok({ allow: true, ttlSec: 3600 }, 60)
  }
})