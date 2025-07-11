import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { venueId } = await req.json();

    if (!venueId) {
      return new Response(
        JSON.stringify({ error: 'Venue ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Getting venue people list for venue:', venueId);

    // Get current venue presence with user profiles
    const { data: venuePresence, error: presenceError } = await supabaseClient
      .from('venue_live_presence')
      .select(`
        user_id,
        vibe,
        checked_in_at,
        session_duration,
        profiles!inner (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('venue_id', venueId)
      .gt('expires_at', new Date().toISOString())
      .order('checked_in_at', { ascending: false });

    if (presenceError) {
      console.error('Error fetching venue presence:', presenceError);
      throw presenceError;
    }

    console.log(`Found ${venuePresence?.length || 0} people at venue`);

    return new Response(
      JSON.stringify(venuePresence || []),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in get-venue-people-list:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});