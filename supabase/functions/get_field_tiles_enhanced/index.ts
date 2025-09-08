import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EnhancedFieldTileRequest {
  grid_cells: string[]
  include_history?: boolean
  time_window_minutes?: number
  audience?: 'public' | 'close'
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

    const { grid_cells, include_history = true, time_window_minutes = 10, audience = 'public' }: EnhancedFieldTileRequest = await req.json()

    if (!grid_cells || grid_cells.length === 0) {
      return new Response(
        JSON.stringify({ tiles: [] }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log(`[ENHANCED_FIELD_TILES] Processing ${grid_cells.length} grid cells with time window: ${time_window_minutes} minutes`)

    try {
      // Use the new database function for k-anonymous field tiles
      const { data: tiles, error } = await supabaseClient.rpc('get_enhanced_field_tiles', {
        grid_cells: grid_cells,
        time_window_minutes: time_window_minutes,
        min_crowd_count: 3, // k-anonymity threshold
        audience: audience
      })

      if (error) throw error

      // Compute velocity and physics in TypeScript for better unit consistency
      const enhancedTiles = computeEnhancedTiles(tiles || [], include_history)

      console.log(`[ENHANCED_FIELD_TILES] Successfully computed ${enhancedTiles.length} enhanced tiles`)

      return new Response(
        JSON.stringify({ tiles: enhancedTiles }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )

    } catch (queryError) {
      console.error('[ENHANCED_FIELD_TILES] Enhanced query failed:', queryError)
      
      // Return minimal safe response for k-anonymity
      return new Response(
        JSON.stringify({ tiles: [], error: 'Processing failed' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Don't expose errors
        }
      )
    }

}

// Compute enhanced tile physics in TypeScript for unit consistency
function computeEnhancedTiles(baseTiles: any[], includeHistory: boolean) {
  return baseTiles.map(tile => {
    // Mock velocity computation (real velocity needs historical data)
    const mockVelocity = {
      vx: 0, // m/s east
      vy: 0, // m/s north  
      magnitude: 0, // m/s
      heading: 0, // radians from north
      confidence: 0.5
    }

    // Movement mode based on mock velocity
    const movementMode = mockVelocity.magnitude < 0.5 ? 'stationary' :
                        mockVelocity.magnitude < 2.0 ? 'walking' :
                        mockVelocity.magnitude < 8.0 ? 'cycling' : 'driving'

    // Afterglow based on recency and crowd count
    const afterglowIntensity = Math.max(0, 
      Math.min(1, (tile.crowd_count / 10) * 0.8)
    )

    return {
      tile_id: tile.tile_id,
      crowd_count: tile.crowd_count,
      avg_vibe: tile.avg_vibe,
      active_floq_ids: tile.active_floq_ids || [],
      updated_at: tile.updated_at,
      center: [tile.center_lng, tile.center_lat],
      velocity: mockVelocity,
      movement_mode: movementMode,
      momentum: tile.crowd_count * mockVelocity.magnitude,
      cohesion_score: 0.5,
      afterglow_intensity: afterglowIntensity,
      convergence_vector: null,
      history: includeHistory ? [] : undefined
    }
  })
}

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