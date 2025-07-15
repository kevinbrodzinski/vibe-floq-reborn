import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const bboxParam = url.searchParams.get('bbox')
    const precisionParam = url.searchParams.get('precision')

    // Validate required parameters
    if (!bboxParam) {
      return new Response('Missing bbox parameter', { 
        status: 400,
        headers: corsHeaders 
      })
    }

    const [minLng, minLat, maxLng, maxLat] = bboxParam.split(',').map(Number)
    const precision = Number(precisionParam || 6)

    // Validate bbox values
    if ([minLng, minLat, maxLng, maxLat].some((v) => isNaN(v))) {
      return new Response('Invalid bbox values', { 
        status: 400,
        headers: corsHeaders 
      })
    }

    // Validate precision range
    if (precision < 4 || precision > 8) {
      return new Response('Precision must be between 4 and 8', { 
        status: 400,
        headers: corsHeaders 
      })
    }

    // Validate bbox bounds (basic sanity check)
    if (minLng >= maxLng || minLat >= maxLat) {
      return new Response('Invalid bbox: min values must be less than max values', { 
        status: 400,
        headers: corsHeaders 
      })
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log(`[clusters] Fetching clusters for bbox: ${bboxParam}, precision: ${precision}`)

    // Call the database function
    const { data, error } = await supabase.rpc('get_vibe_clusters', {
      min_lng: minLng,
      min_lat: minLat,
      max_lng: maxLng,
      max_lat: maxLat,
      p_precision: precision,
    })

    if (error) {
      console.error('[clusters] Database error:', error)
      return new Response('Database error', { 
        status: 500,
        headers: corsHeaders 
      })
    }

    console.log(`[clusters] Returning ${data?.length || 0} clusters`)

    // Transform data to expected format
    const transformedData = (data || []).map((cluster: any) => ({
      gh6: cluster.gh6,
      centroid: {
        type: 'Point',
        coordinates: [
          cluster.centroid ? cluster.centroid.coordinates[0] : 0,
          cluster.centroid ? cluster.centroid.coordinates[1] : 0
        ]
      },
      total: cluster.total,
      vibe_counts: cluster.vibe_counts || {}
    }))

    return new Response(JSON.stringify(transformedData), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30',
      },
    })

  } catch (error) {
    console.error('[clusters] Unexpected error:', error)
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders 
    })
  }
})