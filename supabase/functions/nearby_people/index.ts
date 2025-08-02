import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const { lat, lng, limit = 12 } = Object.fromEntries(new URL(req.url).searchParams)
  
  // Validate required parameters
  if (!lat || !lng) {
    return new Response(JSON.stringify({ error: 'lat,lng required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }

  // Validate numeric inputs
  const numLat = parseFloat(lat)
  const numLng = parseFloat(lng)
  if (isNaN(numLat) || isNaN(numLng)) {
    return new Response(JSON.stringify({ error: 'lat,lng must be numbers' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const { data, error } = await sb.rpc('rank_nearby_people', {
      p_lat: numLat,
      p_lng: numLng,
      p_limit: parseInt(limit.toString())
    })

    if (error) throw error

    return new Response(JSON.stringify(data || []), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error in nearby_people:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})