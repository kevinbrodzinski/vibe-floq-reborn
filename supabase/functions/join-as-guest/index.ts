import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Join as guest function called');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { plan_id, guest_name } = await req.json();

    if (!plan_id || !guest_name) {
      console.log('Missing required fields:', { plan_id, guest_name });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: plan_id and guest_name' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Attempting to join guest to plan:', { plan_id, guest_name });

    // Check if guest name already exists for this plan
    const { data: existing, error: checkError } = await supabase
      .from('plan_participants')
      .select('id')
      .eq('plan_id', plan_id)
      .eq('guest_name', guest_name)
      .eq('is_guest', true)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing guest:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing guest' }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (existing) {
      console.log('Guest already exists for this plan');
      return new Response(
        JSON.stringify({ success: true, participant: existing, message: 'Already joined as guest' }), 
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Insert new guest participant
    const { data, error } = await supabase
      .from('plan_participants')
      .insert({
        plan_id,
        is_guest: true,
        guest_name,
        role: 'participant'
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error inserting guest participant:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to join as guest', details: error.message }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Successfully joined guest to plan:', data);

    return new Response(
      JSON.stringify({ success: true, participant: data }), 
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});