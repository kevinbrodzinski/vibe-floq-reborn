import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export default serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const lat = parseFloat(url.searchParams.get('lat') ?? '')
    const lng = parseFloat(url.searchParams.get('lng') ?? '')
    const vibe = url.searchParams.get('vibe') ?? ''
    const radius = parseInt(url.searchParams.get('radius') ?? '1500', 10)

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !vibe) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: lat, lng, vibe' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`[get_hotspots] Fetching hotspots near ${lat},${lng} vibe:${vibe} radius:${radius}m`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Query the momentum view for hotspots with spatial filtering
    const { data: hotspots, error } = await supabase
      .from('vibe_cluster_momentum')
      .select('*')
      .gte('delta_5m', 3) // Only surging clusters
      .order('delta_5m', { ascending: false })
      .limit(10)

    if (error) {
      console.error('[get_hotspots] Query error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch hotspots' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Transform the data for frontend consumption
    const transformedHotspots = (hotspots || []).map(hotspot => ({
      gh6: hotspot.gh6,
      centroid: hotspot.centroid,
      dom_vibe: hotspot.dom_vibe,
      delta: hotspot.delta_5m,
      total_now: hotspot.total_now,
      user_cnt: hotspot.dom_count,
    }))

    console.log(`[get_hotspots] Returning ${transformedHotspots.length} hotspots`)

    return new Response(
      JSON.stringify(transformedHotspots),
      {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=10' // 10 second cache
        }
      }
    )

  } catch (error) {
    console.error('[get_hotspots] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})