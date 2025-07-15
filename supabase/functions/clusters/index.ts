import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*' }

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  /** 🔑 read the JSON body Supabase sends */
  const { bbox, precision = 6 } = await req.json().catch(() => ({}))

  if (!bbox || !Array.isArray(bbox) || bbox.length !== 4) {
    return new Response('Invalid body, expected { bbox:[minLng,minLat,maxLng,maxLat] }', {
      status: 400,
      headers: cors,
    })
  }

  const [minLng, minLat, maxLng, maxLat] = bbox.map(Number)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data, error } = await supabase.rpc('get_vibe_clusters', {
    min_lng: minLng,
    min_lat: minLat,
    max_lng: maxLng,
    max_lat: maxLat,
    p_precision: precision,
  })

  if (error) {
    console.error(error)
    return new Response('DB error', { status: 500, headers: cors })
  }

  return new Response(JSON.stringify(data ?? []), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})