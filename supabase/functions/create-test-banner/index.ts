import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { venue_id, headline, cta_type = 'join', ttl_secs = 180 } = await req.json()

    if (!venue_id || !headline) {
      return new Response(
        JSON.stringify({ error: 'venue_id and headline are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create banner using the RPC function
    const { data, error } = await supabase.rpc('create_place_banner', {
      _venue_id: venue_id,
      _headline: headline,
      _cta_type: cta_type,
      _ttl_secs: ttl_secs,
      _metadata: {
        live_count: Math.floor(Math.random() * 8) + 2, // Random 2-9 people
        created_by: 'test-function',
        test: true
      }
    })

    if (error) {
      console.error('Failed to create banner:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Created test banner:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        banner_id: data,
        message: 'Test banner created successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})