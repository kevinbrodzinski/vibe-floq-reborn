
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Verify authentication
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { vibe, lat, lng, venue_id = null, broadcast_radius = 500 } = body;

    const updateData: any = {
      user_id: user.id,
      location: `POINT(${lng} ${lat})`,
      broadcast_radius,
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90_000).toISOString()
    };

    // Set venue_id if provided
    if (venue_id !== undefined) {
      updateData.venue_id = venue_id;
    }
    
    // Only set vibe if explicitly provided (don't clear on venue leave)
    if (vibe !== undefined && vibe !== null) {
      updateData.vibe = vibe;
    }

    console.log(`Presence updated: ${user.id}${venue_id ? ` → venue ${venue_id}` : venue_id === null ? ' → left venue' : ''}`);

    // Upsert presence with PostGIS point and optional venue_id
    const { error } = await supabase
      .from("vibes_now")
      .upsert(updateData);

    if (error) {
      console.error("Presence upsert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get nearby users using PostGIS function (now includes self by default)
    const { data: nearby, error: nearbyError } = await supabase.rpc('presence_nearby', {
      lat: lat,
      lng: lng,
      km: 1.0,
      include_self: true
    });

    if (nearbyError) {
      console.error("Nearby presence error:", nearbyError);
    }

    // Get walkable floqs
    const { data: floqs, error: floqsError } = await supabase.rpc('walkable_floqs', {
      lat: lat,
      lng: lng,
      max_walk_meters: 1200
    });

    if (floqsError) {
      console.error("Walkable floqs error:", floqsError);
    }

    return new Response(null, { status: 204, headers: corsHeaders });

  } catch (error) {
    console.error("Presence function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
