import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('POST only', { status: 405, headers: corsHeaders });
  }

  try {
    const { user_id, lat, lng } = await req.json();

    if (!user_id || lat === undefined || lng === undefined) {
      return new Response(
        JSON.stringify({ error: 'user_id, lat, and lng required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get user's Foursquare API key
    const { data: cred } = await supabase
      .from('integrations.user_credential')
      .select('api_key')
      .eq('user_id', user_id)
      .eq('provider_id', 2)
      .maybeSingle();

    if (!cred) {
      return new Response(
        JSON.stringify({ error: 'No Foursquare API key found for user' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Call Foursquare Places API
    const url = new URL('https://api.foursquare.com/v3/places/search');
    url.searchParams.set('ll', `${lat},${lng}`);
    url.searchParams.set('radius', '150');
    url.searchParams.set('limit', '50');

    const response = await fetch(url, {
      headers: {
        'Authorization': cred.api_key,
        'Accept': 'application/json'
      }
    });

    const body = await response.json();

    if (!response.ok) {
      console.error('Foursquare API error:', body);
      return new Response(
        JSON.stringify({ error: body.message || 'Foursquare API error' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Store raw response
    await supabase
      .from('integrations.place_feed_raw')
      .insert({
        user_id,
        provider_id: 2,
        payload: body
      });

    console.log(`Fetched ${body.results?.length || 0} places from Foursquare for user ${user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: body.results?.length || 0 
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('fetch_foursquare error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});