import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EnhancedFieldTileRequest {
  tile_ids: string[]
  include_history?: boolean
  time_window?: string // e.g., '5 minutes'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { tile_ids, include_history = true, time_window = '5 minutes' }: EnhancedFieldTileRequest = await req.json()

    if (!tile_ids || tile_ids.length === 0) {
      return new Response(
        JSON.stringify({ tiles: [] }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log(`[ENHANCED_FIELD_TILES] Processing ${tile_ids.length} tiles with time window: ${time_window}`)

    // Enhanced server-side computation with velocity and momentum
    const enhancedQuery = `
      WITH current_tiles AS (
        SELECT 
          tile_id,
          crowd_count,
          avg_vibe,
          active_floq_ids,
          updated_at,
          centroid,
          ST_X(centroid::geometry) as center_lng,
          ST_Y(centroid::geometry) as center_lat,
          ROW_NUMBER() OVER (PARTITION BY tile_id ORDER BY updated_at DESC) as rn
        FROM field_tiles
        WHERE tile_id = ANY($1::text[])
          AND updated_at >= now() - interval '${time_window}'
      ),
      historical_tiles AS (
        SELECT 
          tile_id,
          ST_X(centroid::geometry) as hist_lng,
          ST_Y(centroid::geometry) as hist_lat,
          updated_at as hist_time,
          crowd_count as hist_count,
          ROW_NUMBER() OVER (PARTITION BY tile_id ORDER BY updated_at DESC) as rn
        FROM field_tiles
        WHERE tile_id = ANY($1::text[])
          AND updated_at >= now() - interval '10 minutes'
          AND updated_at < now() - interval '${time_window}'
      ),
      velocity_computed AS (
        SELECT 
          c.*,
          h.hist_lng,
          h.hist_lat,
          h.hist_time,
          h.hist_count,
          -- Server-side velocity computation
          CASE 
            WHEN h.hist_lng IS NOT NULL THEN
              (c.center_lng - h.hist_lng) * 111320 * COS(RADIANS(c.center_lat)) / 
              GREATEST(EXTRACT(EPOCH FROM (c.updated_at - h.hist_time)), 1)
            ELSE 0
          END as vx,
          CASE
            WHEN h.hist_lat IS NOT NULL THEN
              (c.center_lat - h.hist_lat) * 111320 /
              GREATEST(EXTRACT(EPOCH FROM (c.updated_at - h.hist_time)), 1)
            ELSE 0
          END as vy
        FROM current_tiles c
        LEFT JOIN historical_tiles h ON c.tile_id = h.tile_id AND h.rn = 1
        WHERE c.rn = 1
      )
      SELECT 
        tile_id,
        crowd_count,
        avg_vibe,
        active_floq_ids,
        updated_at,
        center_lng,
        center_lat,
        vx,
        vy,
        SQRT(vx * vx + vy * vy) as magnitude,
        DEGREES(ATAN2(vx, vy)) as heading,
        -- Movement classification
        CASE
          WHEN SQRT(vx * vx + vy * vy) < 0.8 THEN 'stationary'
          WHEN SQRT(vx * vx + vy * vy) < 2.0 THEN 'walking'
          WHEN SQRT(vx * vx + vy * vy) < 8.0 THEN 'cycling'
          WHEN SQRT(vx * vx + vy * vy) < 25.0 THEN 'driving'
          ELSE 'transit'
        END as movement_mode,
        -- Momentum calculation
        crowd_count * SQRT(vx * vx + vy * vy) as momentum,
        -- Afterglow intensity based on recency and activity
        GREATEST(0, 1 - EXTRACT(EPOCH FROM (NOW() - updated_at)) / 300.0) *
        (LEAST(crowd_count::float / 10, 1.0)) as afterglow_intensity,
        -- Confidence based on time delta and speed reasonableness
        CASE 
          WHEN hist_time IS NOT NULL THEN
            LEAST(1.0, EXP(-EXTRACT(EPOCH FROM (updated_at - hist_time)) / 30.0)) *
            (CASE WHEN SQRT(vx * vx + vy * vy) > 50 THEN 0.3 ELSE 1.0 END)
          ELSE 0.5
        END as confidence
      FROM velocity_computed
      ORDER BY crowd_count DESC, afterglow_intensity DESC
      LIMIT 200;
    `;

    try {
      // Use raw SQL for enhanced computation
      const { data: tiles, error } = await supabaseClient.rpc('exec_raw_sql', {
        query: enhancedQuery,
        params: [tile_ids]
      });

      if (error) throw error;

      // Transform to expected format with additional enhancements
      const enhancedTiles = (tiles || []).map(tile => ({
        ...tile,
        velocity: {
          vx: tile.vx || 0,
          vy: tile.vy || 0,
          magnitude: tile.magnitude || 0,
          heading: tile.heading || 0,
          confidence: tile.confidence || 0
        },
        // Initialize empty arrays for client-side population
        history: [],
        trail_segments: [],
        convergence_vector: null,
        cohesion_score: 0.5 // Will be computed client-side with neighbors
      }));

      console.log(`[ENHANCED_FIELD_TILES] Successfully computed ${enhancedTiles.length} enhanced tiles`)

      return new Response(
        JSON.stringify({ tiles: enhancedTiles }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )

    } catch (queryError) {
      console.error('[ENHANCED_FIELD_TILES] Enhanced query failed, falling back to basic tiles:', queryError)
      
      // Fallback to basic field tiles
      const { data: basicTiles, error: basicError } = await supabaseClient
        .from('field_tiles')
        .select('*')
        .in('tile_id', tile_ids)
        .gte('updated_at', `now() - interval '${time_window}'`)
        .order('crowd_count', { ascending: false })
        .limit(200)

      if (basicError) throw basicError

      // Convert basic tiles to enhanced format
      const enhancedTiles = (basicTiles || []).map(tile => ({
        ...tile,
        center_lng: tile.centroid ? parseFloat(tile.centroid.split(',')[0]) : 0,
        center_lat: tile.centroid ? parseFloat(tile.centroid.split(',')[1]) : 0,
        velocity: { vx: 0, vy: 0, magnitude: 0, heading: 0, confidence: 0 },
        movement_mode: 'stationary',
        momentum: 0,
        history: [],
        trail_segments: [],
        cohesion_score: 0,
        convergence_vector: null,
        afterglow_intensity: Math.max(0, 1 - (Date.now() - new Date(tile.updated_at).getTime()) / 60000)
      }));

      return new Response(
        JSON.stringify({ tiles: enhancedTiles }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log(`[ENHANCED_FIELD_TILES] Retrieved ${tiles?.length || 0} enhanced tiles`)

    return new Response(
      JSON.stringify({ tiles: tiles || [] }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('[ENHANCED_FIELD_TILES] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch enhanced field tiles',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})