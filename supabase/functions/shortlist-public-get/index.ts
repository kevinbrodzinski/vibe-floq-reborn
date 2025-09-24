import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ok = (body: unknown, ttl = 60) =>
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return bad('POST required', 405)
  }

  try {
    const { token } = await req.json().catch(() => ({}))
    
    if (!token) {
      return bad('token required', 422)
    }

    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const supa = createClient(url, anon)

    // Validate token and check expiry
    const { data: tokenRow, error: tokenError } = await supa
      .from('shortlist_public_tokens')
      .select('shortlist_id, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (tokenError) throw tokenError
    
    if (!tokenRow) {
      return bad('Token not found', 404)
    }

    if (Date.parse(tokenRow.expires_at) < Date.now()) {
      return bad('Token expired', 410)
    }

    // Fetch shortlist with items
    const { data: shortlist, error: shortlistError } = await supa
      .from('venue_shortlists')
      .select('id, name, created_at, venue_shortlist_items(venue_id)')
      .eq('id', tokenRow.shortlist_id)
      .maybeSingle()

    if (shortlistError) throw shortlistError

    return ok({ shortlist: shortlist || null })
  } catch (e: any) {
    return bad(e?.message ?? 'error', 500)
  }
})