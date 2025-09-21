import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCors } from '../_shared/cors.ts';

Deno.serve(async req => {
  const { preflight, json, error } = buildCors(req);
  if (preflight) return preflight;

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
      return error("bbox must be [west,south,east,north] numbers", 400);
    }

    // ✅ Validate precision
    if (typeof precision !== "number" || precision < 1 || precision > 8) {
      console.error('[clusters] Invalid precision:', precision)
      return error("precision must be 1–8", 400);
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
      return error('Database query failed', 500);
    }

    console.log(`[clusters] Successfully fetched ${data?.length || 0} clusters`)
    return json(data ?? [], 200, 300);
  } catch (err) {
    console.error('[clusters] Edge function error:', err)
    return error('Internal server error', 500);
  }
})