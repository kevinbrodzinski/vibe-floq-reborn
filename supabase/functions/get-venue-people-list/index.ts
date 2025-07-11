import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  /* ----- CORS pre-flight ----- */
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  /* ----- Input validation ----- */
  const { venue_id, limit = 25 } = await req.json();
  if (!venue_id)
    return new Response(JSON.stringify({ error: 'venue_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  /* ----- Supabase client ----- */
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  try {
    console.log('Getting venue people list for venue:', venue_id);

    /* ----- Query live presence with profiles ----- */
    const { data, error } = await supabase
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
      .eq('venue_id', venue_id)
      .gt('expires_at', new Date().toISOString())
      .order('checked_in_at', { ascending: false })
      .limit(+limit);

    if (error) {
      console.error('Error fetching venue presence:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${data?.length || 0} people at venue`);

    return new Response(JSON.stringify(data || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-venue-people-list:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});