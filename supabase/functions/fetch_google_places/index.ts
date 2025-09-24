// Deno runtime • Google NearbySearch → integrations.place_feed_raw
import { serve }        from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { mapToVenue, upsertVenues } from "../_shared/venues.ts";


serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  
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
    
    console.log(`[Google Places] Starting request for location: ${lat},${lng} by=${profile_id ?? "anon"}`);
    
    // Validate required coordinates
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.error(`[Google Places] Missing or invalid coordinates: lat=${lat}, lng=${lng}`);
      return new Response(
        JSON.stringify({ 
          error: "lat & lng are required numbers",
          details: { lat: Number.isFinite(lat), lng: Number.isFinite(lng) }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate coordinates range
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.error(`[Google Places] Invalid coordinates range: lat=${lat}, lng=${lng}`);
      return new Response(
        JSON.stringify({ 
          error: "Invalid coordinates range",
          details: "Latitude must be between -90 and 90, longitude between -180 and 180"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    /* ---- 1. server-stored API key --------------------------------- */
    const API_KEY = Deno.env.get("GOOGLE_PLACES_KEY");
    if (!API_KEY) {
      console.error("[Google Places] GOOGLE_PLACES_KEY missing from environment");
      return new Response(
        JSON.stringify({ error: "API key not configured. Please configure GOOGLE_PLACES_KEY in edge function secrets." }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    /* ---- 2. call Google Places NearbySearch ----------------------- */
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
    );
    url.searchParams.set("key", API_KEY);
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", "1500");            // Increased radius
    url.searchParams.set("type", "point_of_interest");

    console.log(`[Google Places] Calling API: ${url.toString().replace(API_KEY, '[REDACTED]')}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[Google Places] HTTP error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: `Google Places API HTTP error: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gp = await response.json();
    console.log(`[Google Places] API Response status: ${gp.status}, results count: ${gp.results?.length || 0}`);
    
    if (gp.status === "REQUEST_DENIED") {
      console.error(`[Google Places] Request denied: ${gp.error_message}`);
      return new Response(
        JSON.stringify({ 
          error: "Google Places API access denied. Please check your API key permissions.",
          details: gp.error_message,
          help: "Ensure your Google Cloud project has Places API enabled and the API key has proper restrictions."
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (gp.status !== "OK" && gp.status !== "ZERO_RESULTS") {
      console.error(`[Google Places] API error: ${gp.status} - ${gp.error_message}`);
      return new Response(
        JSON.stringify({ 
          error: `Google Places API error: ${gp.status}`,
          details: gp.error_message 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (gp.status === "ZERO_RESULTS") {
      console.log(`[Google Places] No results found for location ${lat},${lng}`);
      return new Response(
        JSON.stringify({ ok: true, count: 0, message: "No places found in this area" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    /* ---- 3. transform + upsert venues ----------------------------- */
    console.log(`[Google Places] Transforming ${gp.results.length} results`);
    const mapped = gp.results.map((r: any) => {
      try {
        return mapToVenue({ provider: "google", r });
      } catch (mapError) {
        console.error(`[Google Places] Failed to map venue:`, r, mapError);
        return null;
      }
    }).filter(Boolean);

    console.log(`[Google Places] Successfully mapped ${mapped.length} venues`);
    
    if (mapped.length > 0) {
      await upsertVenues(mapped);
      console.log(`[Google Places] Successfully upserted ${mapped.length} venues`);
    }

    console.log(`[Google Places] OK • ${mapped.length} places • radius=1500m • by=${profile_id ?? "anon"}`);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        count: mapped.length,
        source: "google_places",
        location: { lat, lng }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error("[Google Places] Unexpected error:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: errorMessage,
        source: "google_places"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});