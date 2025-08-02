import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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
    s: Math.round(avgSaturation * 100) / 100,
    l: Math.round(avgLightness * 100) / 100
  }
}

// Convert lat/lng to geohash-5 tile ID
const latLngToTileId = (lat: number, lng: number): string => {
  // Simplified geohash-5 implementation
  const precision = 5
  let latRange = [-90, 90]
  let lngRange = [-180, 180]
  let hash = ''
  let bit = 0
  let ch = 0
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz'
  let isLng = true

  while (hash.length < precision) {
    if (isLng) {
      const mid = (lngRange[0] + lngRange[1]) / 2
      if (lng >= mid) {
        ch |= 1 << (4 - bit)
        lngRange[0] = mid
      } else {
        lngRange[1] = mid
      }
    } else {
      const mid = (latRange[0] + latRange[1]) / 2
      if (lat >= mid) {
        ch |= 1 << (4 - bit)
        latRange[0] = mid
      } else {
        latRange[1] = mid
      }
    }
    
    isLng = !isLng
    if (bit < 4) {
      bit++
    } else {
      hash += base32[ch]
      bit = 0
      ch = 0
    }
  }
  
  return hash
}

Deno.serve(async (req) => {
  console.log('[GET_FIELD_TILES] Request received:', req.method)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { tile_ids }: FieldTileRequest = await req.json()
    console.log('[GET_FIELD_TILES] Processing tile IDs:', tile_ids)

    if (!tile_ids || !Array.isArray(tile_ids)) {
      return new Response(
        JSON.stringify({ error: 'Invalid tile_ids parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get real presence data from vibes_now table
    const { data: presenceData, error: presenceError } = await supabase
      .from('vibes_now')
      .select('profile_id, location, vibe, updated_at')
      .not('location', 'is', null)

    if (presenceError) {
      console.error('[GET_FIELD_TILES] Error fetching presence data:', presenceError)
    }

    // Get active floq data
    const { data: floqData, error: floqError } = await supabase
      .from('floqs')
      .select('id, location, participants_count')
      .not('location', 'is', null)
      .gte('participants_count', 2)

    if (floqError) {
      console.error('[GET_FIELD_TILES] Error fetching floq data:', floqError)
    }

    // Process each requested tile
    const tiles = tile_ids.map(tileId => {
      // Find all presence points in this tile
      const tilePresence = (presenceData || []).filter(presence => {
        if (!presence.location?.coordinates) return false
        const [lng, lat] = presence.location.coordinates
        const presenceTileId = latLngToTileId(lat, lng)
        return presenceTileId === tileId
      })

      // Find all floqs in this tile
      const tileFloqs = (floqData || []).filter(floq => {
        if (!floq.location?.coordinates) return false
        const [lng, lat] = floq.location.coordinates
        const floqTileId = latLngToTileId(lat, lng)
        return floqTileId === tileId
      })

      // Calculate crowd count and average vibe
      const crowdCount = tilePresence.length + tileFloqs.reduce((sum, floq) => sum + (floq.participants_count || 0), 0)
      const vibes = tilePresence.map(p => p.vibe).filter(Boolean)
      const avgVibe = calculateAverageVibe(vibes)
      const activeFloqIds = tileFloqs.map(f => f.id)

      console.log(`[GET_FIELD_TILES] Tile ${tileId}: ${crowdCount} people, ${vibes.length} vibes, ${activeFloqIds.length} floqs`)

      return {
        tile_id: tileId,
        crowd_count: crowdCount,
        avg_vibe: avgVibe,
        active_floq_ids: activeFloqIds,
        updated_at: new Date().toISOString()
      }
    })

    const response: FieldTileResponse = { tiles }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('[GET_FIELD_TILES] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})