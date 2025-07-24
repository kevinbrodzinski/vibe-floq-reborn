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

    // Get Google API key from secrets
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_KEY');
    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Places API key not configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Call Google Places API
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.set('key', googleApiKey);
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('radius', '150');
    url.searchParams.set('type', 'point_of_interest');

    const response = await fetch(url);
    const body = await response.json();

    if (!response.ok) {
      console.error('Google Places API error:', body);
      return new Response(
        JSON.stringify({ error: body.error_message || 'Google Places API error' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Store raw response
    await supabase
      .from('integrations.place_feed_raw')
      .insert({
        user_id,
        provider_id: 1,
        payload: body
      });

    console.log(`Fetched ${body.results?.length || 0} places from Google for user ${user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: body.results?.length || 0 
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('fetch_google_places error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});