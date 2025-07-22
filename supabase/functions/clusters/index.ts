import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    console.log(`[clusters] ${req.method} request received`)
    
    /** 🔑 read the JSON body Supabase sends */
    let bbox: any, precision = 6
    
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      bbox = body.bbox
      precision = body.precision || 6
      console.log(`[clusters] POST body:`, { bbox, precision })
    } else {
      // Handle GET requests with query parameters (fallback)
      const url = new URL(req.url)
      const bboxParam = url.searchParams.get('bbox')
      if (bboxParam) {
        bbox = bboxParam.split(',').map(Number)
      }
      precision = parseInt(url.searchParams.get('precision') || '6', 10)
      console.log(`[clusters] GET params:`, { bbox, precision })
    }

    // ✅ Validate bbox
    if (
      !Array.isArray(bbox) ||
      bbox.length !== 4 ||
      bbox.some((n) => typeof n !== "number" || Number.isNaN(n))
    ) {
      console.error('[clusters] Invalid bbox:', bbox)
      return new Response(
        JSON.stringify({ error: "bbox must be [west,south,east,north] numbers" }),
        {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      )
    }

    // ✅ Validate precision
    if (typeof precision !== "number" || precision < 1 || precision > 8) {
      console.error('[clusters] Invalid precision:', precision)
      return new Response(
        JSON.stringify({ error: "precision must be 1–8" }),
        {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      )
    }

    const [minLng, minLat, maxLng, maxLat] = bbox
    console.log(`[clusters] Querying bbox: [${minLng}, ${minLat}, ${maxLng}, ${maxLat}], precision: ${precision}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await supabase.rpc('get_vibe_clusters', {
      min_lng: minLng,
      min_lat: minLat,
      max_lng: maxLng,
      max_lat: maxLat,
      p_precision: precision,
    })

    if (error) {
      console.error('[clusters] RPC error:', error)
      return new Response(
        JSON.stringify({ error: 'Database query failed', details: error.message }),
        { 
          status: 500, 
          headers: { ...cors, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`[clusters] Successfully fetched ${data?.length || 0} clusters`)
    return new Response(JSON.stringify(data ?? []), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[clusters] Edge function error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { 
        status: 500, 
        headers: { ...cors, 'Content-Type': 'application/json' }
      }
    )
  }
})