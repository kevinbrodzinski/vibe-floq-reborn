import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ok = (body: unknown, ttl = 30) =>
  new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${ttl}`,
    },
  })

const bad = (msg: string, code = 400) =>
  new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { ...corsHeaders, 'content-type': 'application/json' }
  })

function generateToken(length = 28): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return bad('POST required', 405)
  }

  try {
    const { shortlist_id, days = 7 } = await req.json().catch(() => ({}))
    
    if (!shortlist_id) {
      return bad('shortlist_id required', 422)
    }

    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const supa = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    })

    const token = generateToken(28)
    const expires_at = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supa.from('shortlist_public_tokens').insert({
      token,
      shortlist_id,
      expires_at
    })

    if (error) throw error

    return ok({ token, expires_at })
  } catch (e: any) {
    return bad(e?.message ?? 'error', 500)
  }
})