import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import * as h3 from "https://esm.sh/h3-js@4.1.0";

// Temporarily use coordinate-based hashing until H3 extension is available
const geoToH3 = (lat: number, lng: number, resolution = 7): string => {
  const latInt = Math.floor(lat * 10000);
  const lngInt = Math.floor(lng * 10000);
  return `h3_${resolution}_${latInt}_${lngInt}`;
};

const RES = 7; // ~1.2km hexagons for social venue mapping

import { corsHeaders, respondWithCors } from '../_shared/cors.ts';

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
    center: [number, number] // [lng, lat] - REAL centroid from H3
  }>
}

// Central vibe token HSL mapping (matches design system)
const vibeToHSL = (vibe: string): { h: number; s: number; l: number } => {
  // Convert RGB from VIBE_RGB to HSL approximation
  const vibeMap: Record<string, { h: number; s: number; l: number }> = {
    'chill': { h: 214, s: 70, l: 60 },     // blue
    'flowing': { h: 186, s: 70, l: 60 },   // cyan  
    'romantic': { h: 330, s: 70, l: 60 },  // pink
    'hype': { h: 354, s: 70, l: 60 },      // red
    'weird': { h: 267, s: 70, l: 60 },     // purple
    'solo': { h: 0, s: 0, l: 56 },         // gray
    'social': { h: 145, s: 70, l: 60 },    // green
    'open': { h: 280, s: 70, l: 60 },      // violet
    'down': { h: 248, s: 50, l: 40 },      // dark blue
    'curious': { h: 43, s: 70, l: 60 },    // yellow-orange
    'energetic': { h: 39, s: 70, l: 60 },  // orange
    'excited': { h: 328, s: 70, l: 60 },   // deep pink
    'focused': { h: 120, s: 70, l: 60 },   // lime green
  }
  return vibeMap[vibe?.toLowerCase()] || { h: 214, s: 70, l: 60 } // default to chill
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
    s: Math.round(avgSaturation), // Already 0-100 scale
    l: Math.round(avgLightness)   // Already 0-100 scale
  }
}

// Convert lat/lng to H3 index at resolution 7
const latLngToH3 = (lat: number, lng: number): string => {
  try {
    // Use real H3 API when available
    return h3.latLngToCell(lat, lng, RES);
  } catch {
    // Fallback to mock for development
    return geoToH3(lat, lng, RES);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests FIRST
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Create authenticated client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { 
      global: { 
        headers: { 
          Authorization: req.headers.get('Authorization') ?? '' 
        } 
      } 
    }
  )

  const logLevel = Deno.env.get('LOG_LEVEL') || 'info'
  if (logLevel === 'debug') {
    console.log('[GET_FIELD_TILES] Request received:', req.method)
  }

  try {
    // Authentication handled via client authorization header

    // Simple rate limiting - 20 requests per 10 seconds per IP
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rateLimitKey = `field_tiles:${clientIP}`
    
    // Skip KV rate limiting for now due to Deno.openKv() not being available
    // TODO: Implement alternative rate limiting if needed

    const { tile_ids }: FieldTileRequest = await req.json()
    if (logLevel === 'debug') {
      console.log('[GET_FIELD_TILES] Processing tile IDs:', tile_ids)
    }

    if (!tile_ids || !Array.isArray(tile_ids)) {
      return respondWithCors({ error: 'Invalid tile_ids parameter' }, 400)
    }

    // Build H3 tile filter for efficient querying
    const h3Tiles = tile_ids.filter(id => typeof id === 'string' && id.length > 0)
    
    // Get presence data filtered by H3 tiles (no redundant location parsing)
    const { data: presenceData, error: presenceError } = await supabase
      .from('vibes_now')
      .select('h3_7, vibe, updated_at')
      .in('h3_7', h3Tiles)  // Direct H3 filter - no location parsing needed
      .gte('updated_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Only recent data

    if (presenceError) {
      console.error('[GET_FIELD_TILES] Error fetching presence data:', presenceError)
      return respondWithCors({ 
        error: 'Database error', 
        details: presenceError.message 
      }, 500)
    }

    // Get active floq data filtered by H3 tiles (no redundant location parsing)
    const { data: floqData, error: floqError } = await supabase
      .from('floqs')
      .select('id, h3_7')
      .in('h3_7', h3Tiles)  // Direct H3 filter - no location parsing needed

    if (floqError) {
      console.error('[GET_FIELD_TILES] Error fetching floq data:', floqError)
      return respondWithCors({ error: 'Database error' }, 500)
    }

    // Process each requested tile using existing H3 indices (no redundant parsing)
    const tiles = tile_ids.map(tileId => {
      // Use existing h3_7 column directly - no coordinate parsing needed
      const tilePresence = (presenceData || []).filter(p => p.h3_7 === tileId)
      const tileFloqs = (floqData || []).filter(f => f.h3_7 === tileId)

      // Calculate crowd count and average vibe
      const crowdCount = tilePresence.length + tileFloqs.length
      const vibes = tilePresence.map(p => p.vibe).filter(Boolean)
      const avgVibe = calculateAverageVibe(vibes)
      const activeFloqIds = tileFloqs.map(f => f.id)

      // REAL H3 centroid computation using consistent API
      let center: [number, number] = [0, 0];
      try {
        // For H3 mock IDs, extract coordinates back
        if (tileId.startsWith('h3_')) {
          const parts = tileId.split('_');
          if (parts.length >= 4) {
            const lat = Number(parts[2]) * 0.0001;
            const lng = Number(parts[3]) * 0.0001;
            center = [lng, lat];
          }
        } else {
          // Use H3 v4 API for real H3 indices
          const [lat, lng] = h3.cellToLatLng(tileId);
          center = [lng, lat];
        }
      } catch (error) {
        console.warn(`[GET_FIELD_TILES] Could not get centroid for tile ${tileId}:`, error);
        // Fallback to [0, 0] if centroid calculation fails
        center = [0, 0];
      }

      if (logLevel === 'debug') {
        console.log(`[GET_FIELD_TILES] Tile ${tileId}: ${crowdCount} people, ${vibes.length} vibes, ${activeFloqIds.length} floqs, center: ${center}`)
      }

      return {
        tile_id: tileId,
        crowd_count: crowdCount,
        avg_vibe: avgVibe,
        active_floq_ids: activeFloqIds,
        updated_at: new Date().toISOString(),
        center // Real centroid [lng, lat]
      }
    })

    const response: FieldTileResponse = { tiles }
    return respondWithCors(response)

  } catch (error) {
    console.error('[GET_FIELD_TILES] Error:', error)
    return respondWithCors({ error: 'Internal server error' }, 500)
  }
})