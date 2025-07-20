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

    const { planId, guestName } = await req.json()

    if (!planId || !guestName) {
      return new Response(
        JSON.stringify({ error: 'planId and guestName are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if guest name already exists for this plan
    const { data: existing } = await supabase
      .from('plan_participants')
      .select('id')
      .eq('plan_id', planId)
      .eq('is_guest', true)
      .eq('guest_name', guestName)
      .single()

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Guest name already taken for this plan' }),
        { 
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Add guest participant
    const { data: participant, error } = await supabase
      .from('plan_participants')
      .insert({
        plan_id: planId,
        is_guest: true,
        guest_name: guestName,
        role: 'participant'
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding guest participant:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to join as guest' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        participant: {
          id: participant.id,
          guest_name: participant.guest_name,
          role: participant.role,
          joined_at: participant.joined_at
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})