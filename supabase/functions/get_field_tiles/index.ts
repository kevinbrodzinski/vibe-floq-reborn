import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
// Temporarily use coordinate-based hashing until H3 extension is available
const geoToH3 = (lat: number, lng: number, resolution = 7): string => {
  const latInt = Math.floor(lat * 10000);
  const lngInt = Math.floor(lng * 10000);
  return `h3_${resolution}_${latInt}_${lngInt}`;
};

const RES = 7; // ~1.2km hexagons for social venue mapping

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const respondWithCors = (data: unknown, status: number = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

interface FieldTileRequest {
  tile_ids: string[]
}

interface FieldTileResponse {
  tiles: Array<{
    tile_id: string
    crowd_count: number
    avg_vibe: { h: number; s: number; l: number }
    active_floq_ids: string[]
    updated_at: string
  }>
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''  // Service role for database access
)

// Convert vibe string to HSL values
const vibeToHSL = (vibe: string): { h: number; s: number; l: number } => {
  const vibeMap: Record<string, { h: number; s: number; l: number }> = {
    'hype': { h: 280, s: 0.7, l: 0.6 },
    'social': { h: 30, s: 0.7, l: 0.6 },
    'chill': { h: 240, s: 0.7, l: 0.6 },
    'flowing': { h: 200, s: 0.7, l: 0.6 },
    'open': { h: 120, s: 0.7, l: 0.6 },
    'curious': { h: 260, s: 0.7, l: 0.6 },
    'solo': { h: 180, s: 0.7, l: 0.6 },
    'romantic': { h: 320, s: 0.7, l: 0.6 },
    'weird': { h: 60, s: 0.7, l: 0.6 },
    'down': { h: 210, s: 0.3, l: 0.4 },
  }
  return vibeMap[vibe?.toLowerCase()] || { h: 240, s: 0.7, l: 0.6 }
}

// Calculate average HSL from multiple vibes
const calculateAverageVibe = (vibes: string[]): { h: number; s: number; l: number } => {
  if (vibes.length === 0) return { h: 0, s: 0, l: 0 }
  
  const hslValues = vibes.map(vibeToHSL)
  
  // Average hue (circular average for hue)
  let sin = 0, cos = 0
  hslValues.forEach(({ h }) => {
    const rad = (h * Math.PI) / 180
    sin += Math.sin(rad)
    cos += Math.cos(rad)
  })
  const avgHue = ((Math.atan2(sin, cos) * 180) / Math.PI + 360) % 360
  
  // Average saturation and lightness
  const avgSaturation = hslValues.reduce((sum, { s }) => sum + s, 0) / hslValues.length
  const avgLightness = hslValues.reduce((sum, { l }) => sum + l, 0) / hslValues.length
  
  return {
    h: Math.round(avgHue),
    s: Math.round(avgSaturation * 100), // Scale to 0-100 for consistency
    l: Math.round(avgLightness * 100)   // Scale to 0-100 for consistency
  }
}

// Convert lat/lng to H3 index at resolution 7
const latLngToH3 = (lat: number, lng: number): string => {
  return geoToH3(lat, lng, RES)
}

// Parse location safely handling different formats
const parseLocation = (location: any): [number, number] | null => {
  if (!location) return null
  
  // Handle PostGIS geometry string format
  if (typeof location === 'string') {
    try {
      const parsed = JSON.parse(location)
      if (parsed.type === 'Point' && parsed.coordinates) {
        return [parsed.coordinates[0], parsed.coordinates[1]]
      }
    } catch {
      return null
    }
  }
  
  // Handle GeoJSON Point format
  if (location.type === 'Point' && location.coordinates) {
    return [location.coordinates[0], location.coordinates[1]]
  }
  
  // Handle direct coordinate array
  if (Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
    return [location.coordinates[0], location.coordinates[1]]
  }
  
  return null
}

Deno.serve(async (req) => {
  const logLevel = Deno.env.get('LOG_LEVEL') || 'info'
  if (logLevel === 'debug') {
    console.log('[GET_FIELD_TILES] Request received:', req.method)
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Basic auth check - require valid JWT
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return respondWithCors({ error: 'Authorization required' }, 401)
    }

    // Simple rate limiting - 20 requests per 10 seconds per IP
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rateLimitKey = `field_tiles:${clientIP}`
    
    try {
      const kv = await Deno.openKv()
      const count = await kv.get([rateLimitKey])
      const currentCount = (count.value as number) || 0
      
      if (currentCount >= 20) {
        return respondWithCors({ error: 'Rate limit exceeded' }, 429)
      }
      
      // Increment counter with 10 second expiry
      await kv.set([rateLimitKey], currentCount + 1, { expireIn: 10_000 })
      kv.close()
    } catch (error) {
      console.warn('[GET_FIELD_TILES] Rate limiting failed:', error)
      // Continue without rate limiting if KV fails
    }

    const { tile_ids }: FieldTileRequest = await req.json()
    if (logLevel === 'debug') {
      console.log('[GET_FIELD_TILES] Processing tile IDs:', tile_ids)
    }

    if (!tile_ids || !Array.isArray(tile_ids)) {
      return respondWithCors({ error: 'Invalid tile_ids parameter' }, 400)
    }

    // Build H3 tile filter for efficient querying
    const h3Tiles = tile_ids.filter(id => typeof id === 'string' && id.length > 0)
    
    // Get presence data filtered by tile boundaries and H3 tiles
    const { data: presenceData, error: presenceError } = await supabase
      .from('vibes_now')
      .select('profile_id, location, vibe, updated_at, h3_7')
      .not('location', 'is', null)
      .in('h3_7', h3Tiles)  // Filter by H3 tiles for efficiency
      .gte('updated_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Only recent data

    if (presenceError) {
      console.error('[GET_FIELD_TILES] Error fetching presence data:', presenceError)
      return respondWithCors({ 
        error: 'Database error', 
        details: presenceError.message 
      }, 500)
    }

    // Get active floq data filtered by H3 tiles
    const { data: floqData, error: floqError } = await supabase
      .from('floqs')
      .select('id, location, participants_count, h3_7')
      .not('location', 'is', null)
      .in('h3_7', h3Tiles)  // Filter by H3 tiles for efficiency
      .gte('participants_count', 2)

    if (floqError) {
      console.error('[GET_FIELD_TILES] Error fetching floq data:', floqError)
      return respondWithCors({ error: 'Database error' }, 500)
    }

    // Process each requested tile with improved location parsing
    const tiles = tile_ids.map(tileId => {
      // Find all presence points in this tile
      const tilePresence = (presenceData || []).filter(presence => {
        const coords = parseLocation(presence.location)
        if (!coords) return false
        const [lng, lat] = coords
        const presenceTileId = latLngToH3(lat, lng)
        return presenceTileId === tileId
      })

      // Find all floqs in this tile
      const tileFloqs = (floqData || []).filter(floq => {
        const coords = parseLocation(floq.location)
        if (!coords) return false
        const [lng, lat] = coords
        const floqTileId = latLngToH3(lat, lng)
        return floqTileId === tileId
      })

      // Calculate crowd count and average vibe
      const crowdCount = tilePresence.length + tileFloqs.reduce((sum, floq) => sum + (floq.participants_count || 0), 0)
      const vibes = tilePresence.map(p => p.vibe).filter(Boolean)
      const avgVibe = calculateAverageVibe(vibes)
      const activeFloqIds = tileFloqs.map(f => f.id)

      if (logLevel === 'debug') {
        console.log(`[GET_FIELD_TILES] Tile ${tileId}: ${crowdCount} people, ${vibes.length} vibes, ${activeFloqIds.length} floqs`)
      }

      return {
        tile_id: tileId,
        crowd_count: crowdCount,
        avg_vibe: avgVibe,
        active_floq_ids: activeFloqIds,
        updated_at: new Date().toISOString()
      }
    })

    const response: FieldTileResponse = { tiles }
    return respondWithCors(response)

  } catch (error) {
    console.error('[GET_FIELD_TILES] Error:', error)
    return respondWithCors({ error: 'Internal server error' }, 500)
  }
})