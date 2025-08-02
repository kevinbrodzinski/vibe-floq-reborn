// Deno runtime • Foursquare Nearby → integrations.place_feed_raw
import { serve }        from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";
import { corsHeaders } from "../_shared/cors.ts";
import { mapToVenue, upsertVenues } from "../_shared/venues.ts";


serve(async (req) => {
  // Handle CORS preflight requests FIRST
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  if (req.method !== "POST") {
    return new Response("POST only", { status: 405, headers: corsHeaders });
  }

  try {
    const payload = await req.json() as {
      profile_id?: string;
      lat?: number;
      lng?: number;
    };
    
    const lat = Number(payload.lat);
    const lng = Number(payload.lng);
    
    // No auth required for public function
    const profile_id = payload.profile_id;
    
    console.log(`[Foursquare] Starting request for location: ${lat},${lng} by=${profile_id ?? "anon"}`);
    
    // Validate required coordinates
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.error(`[Foursquare] Missing or invalid coordinates: lat=${lat}, lng=${lng}`);
      return new Response(
        JSON.stringify({ 
          error: "lat & lng are required numbers",
          details: { lat: Number.isFinite(lat), lng: Number.isFinite(lng) }
        }),
        { status: 400, headers: corsHeaders },
      );
    }

    // Validate coordinates range
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.error(`[Foursquare] Invalid coordinates range: lat=${lat}, lng=${lng}`);
      return new Response(
        JSON.stringify({ 
          error: "Invalid coordinates range",
          details: "Latitude must be between -90 and 90, longitude between -180 and 180"
        }),
        { status: 400, headers: corsHeaders },
      );
    }

    /* ---- 1. server-stored FSQ key with debug info --------------------------------- */
    console.log('[DEBUG] FSQ key len:', (Deno.env.get('FSQ_SERVICE_KEY')||'').length);
    const API_KEY = Deno.env.get("FSQ_SERVICE_KEY");
    if (!API_KEY) {
      console.error("[Foursquare] FSQ_SERVICE_KEY missing from environment");
      return new Response(
        JSON.stringify({ error: "API key not configured. Please configure FSQ_SERVICE_KEY in edge function secrets." }), 
        { status: 500, headers: corsHeaders }
      );
    }

    /* ---- 2. call Foursquare "Nearby" ------------------------------ */
    const url = `https://api.foursquare.com/v3/places/nearby?ll=${lat},${lng}&radius=1500&limit=50`;
    console.log(`[Foursquare] Calling API: ${url}`);
    
    const response = await fetch(url, {
      headers: { 
        Accept: "application/json", 
        Authorization: API_KEY 
      },
    });

    if (!response.ok) {
      console.error(`[Foursquare] HTTP error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`[Foursquare] Error response body: ${errorText}`);
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: "Foursquare API authentication failed. Please check your API key.",
            details: "API key may be invalid or expired"
          }),
          { status: 401, headers: corsHeaders }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Foursquare API HTTP error: ${response.status}`,
          details: errorText
        }),
        { status: 502, headers: corsHeaders }
      );
    }

    const fsq = await response.json();
    console.log(`[Foursquare] API Response received, results count: ${fsq.results?.length || 0}`);

    if (fsq.message) {
      console.error(`[Foursquare] API error message: ${fsq.message}`);
      return new Response(
        JSON.stringify({ 
          error: "Foursquare API error",
          details: fsq.message 
        }),
        { status: 502, headers: corsHeaders }
      );
    }

    if (!fsq.results || fsq.results.length === 0) {
      console.log(`[Foursquare] No results found for location ${lat},${lng}`);
      return new Response(
        JSON.stringify({ ok: true, count: 0, message: "No places found in this area" }),
        { headers: corsHeaders }
      );
    }

    /* ---- 3. transform + upsert venues ----------------------------- */
    console.log(`[Foursquare] Transforming ${fsq.results.length} results`);
    const mapped = fsq.results.map((r: any) => {
      try {
        // Ensure coordinates exist with fallbacks
        if (!r.geocodes?.main?.latitude || !r.geocodes?.main?.longitude) {
          r.geocodes = { main: { latitude: lat, longitude: lng } };
        }
        return mapToVenue({ provider: "foursquare", r });
      } catch (mapError) {
        console.error(`[Foursquare] Failed to map venue:`, r, mapError);
        return null;
      }
    }).filter(Boolean);

    console.log(`[Foursquare] Successfully mapped ${mapped.length} venues`);
    
    if (mapped.length > 0) {
      await upsertVenues(mapped);
      console.log(`[Foursquare] Successfully upserted ${mapped.length} venues`);
    }

    console.log(`[Foursquare] OK • ${mapped.length} venues • radius=1500m • by=${profile_id ?? "anon"}`);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        count: mapped.length,
        source: "foursquare",
        location: { lat, lng }
      }),
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error("[Foursquare] Unexpected error:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: errorMessage,
        source: "foursquare"
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});