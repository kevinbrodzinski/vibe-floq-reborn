// deno deploy standard library
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
const PLACES_KEY = Deno.env.get("GOOGLE_PLACES_KEY")!;          // <-- using your existing secret name
const RADIUS_M   = 1200;                                        // 1.2 km default search

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("POST only", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { lat, lng, keyword } = await req.json();            // body: {lat,lng,keyword?}
    
    if (!lat || !lng) {
      return new Response(JSON.stringify({ error: "lat and lng are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius",  String(RADIUS_M));
    url.searchParams.set("key",     PLACES_KEY);
    if (keyword) url.searchParams.set("keyword", keyword);

    console.log(`Fetching places near ${lat},${lng} with radius ${RADIUS_M}m`);
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (!res.ok) {
      console.error("Google Places API error:", data);
      return new Response(JSON.stringify({ error: data.error_message || "Places API error" }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { results } = data;
    console.log(`Found ${results?.length || 0} places from Google`);

    const rows = results.map((p: any) => ({
      provider:     "google_places",
      provider_id:  p.place_id,
      name:         p.name,
      address:      p.vicinity,
      categories:   p.types,
      rating:       p.rating ?? null,
      lat:          p.geometry.location.lat,
      lng:          p.geometry.location.lng,
      photo_url:    p.photos?.[0]?.photo_reference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=720&photo_reference=${p.photos[0].photo_reference}&key=${PLACES_KEY}`
        : null,
      updated_at:   new Date().toISOString()
    }));

    console.log(`Upserting ${rows.length} venues to database`);
    
    const { error } = await supabase
      .from("venues")
      .upsert(rows, { onConflict: "provider,provider_id" });

    if (error) {
      console.error("Database upsert error:", error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Successfully upserted ${rows.length} venues`);
    
    return new Response(JSON.stringify({ 
      success: true,
      upserted: rows.length,
      location: { lat, lng, radius: RADIUS_M }
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error("Sync places error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});