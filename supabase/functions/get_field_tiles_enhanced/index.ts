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

    // Call the enhanced database function
    const { data: tiles, error } = await supabaseClient.rpc('get_field_tiles_enhanced', {
      p_tile_ids: tile_ids,
      p_include_history: include_history,
      p_time_window: time_window
    })

    if (error) {
      console.error('[ENHANCED_FIELD_TILES] Database error:', error)
      
      // Fallback to basic field tiles if enhanced function fails
      const { data: basicTiles, error: basicError } = await supabaseClient
        .from('field_tiles')
        .select('*')
        .in('tile_id', tile_ids)
        .gte('updated_at', `now() - interval '${time_window}'`)

      if (basicError) {
        throw basicError
      }

      // Convert basic tiles to enhanced format
      const enhancedTiles = (basicTiles || []).map(tile => ({
        ...tile,
        velocity: { vx: 0, vy: 0, magnitude: 0, heading: 0, confidence: 0 },
        movement_mode: 'stationary',
        history: null,
        momentum: 0.5,
        cohesion_score: 0,
        convergence_vector: null,
        afterglow_intensity: Math.max(0, 1 - (Date.now() - new Date(tile.updated_at).getTime()) / 60000)
      }))

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