import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: cred } = await supabase
      .from("integrations.user_credential")
      .select("api_key, provider_id")
      .eq("user_id", user_id)
      .eq("provider_id", 2)          // 2 = foursquare
      .maybeSingle();

    if (!cred) {
      return new Response(
        JSON.stringify({ error: "no Foursquare key" }), 
        { status: 400, headers: corsHeaders }
      );
    }

    const fsq = await fetch(
      `https://api.foursquare.com/v3/places/nearby?ll=${lat},${lng}&radius=150&limit=25`,
      { headers: { Accept: "application/json", Authorization: cred.api_key } }
    ).then(r => r.json());

    if (fsq.message) {
      console.error('Foursquare API error:', fsq.message);
      return new Response(
        JSON.stringify({ error: fsq.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    await supabase.from("integrations.place_feed_raw")
                  .insert({ user_id, provider_id: 2, payload: fsq });

    console.log(`Fetched ${fsq.results?.length || 0} places from Foursquare for user ${user_id}`);

    return new Response(JSON.stringify({ ok: true, count: fsq.results?.length || 0 }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('fetch_foursquare error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});