import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user ID from request
    const { user_id, date } = await req.json()
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const targetDate = date || new Date().toISOString().split('T')[0]
    
    console.log(`🎯 Triggering afterglow generation for user ${user_id} on ${targetDate}`)

    // Call the generate-daily-afterglow function
    const { data, error } = await supabaseClient.functions.invoke('generate-daily-afterglow', {
      body: {
        user_id,
        date: targetDate
      }
    })

    if (error) {
      console.error('❌ Error generating afterglow:', error)
      throw error
    }

    console.log('✅ Afterglow generation triggered successfully:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Afterglow generation triggered for ${targetDate}`,
        data 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error in trigger-afterglow-generation:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})