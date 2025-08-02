import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  // query-params
  const url = new URL(req.url)
  const lat = Number(url.searchParams.get('lat'))
  const lng = Number(url.searchParams.get('lng'))
  const limit = Number(url.searchParams.get('limit') || 12)

  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    return new Response(JSON.stringify({ error: 'lat,lng required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})

  // Supabase service client
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await sb
    .rpc('rank_nearby_people', { p_lat: lat, p_lng: lng, p_limit: limit })

  return new Response(JSON.stringify(error ?? data), {
    status: error ? 500 : 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})