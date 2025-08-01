// Deno runtime • Google NearbySearch → integrations.place_feed_raw
import { serve }        from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";
import { mapToVenue, upsertVenues } from "../_shared/venues.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")
    return new Response("POST only", { status: 405, headers: CORS });

  try {
    console.log(`[Google Places] Starting request for location: ${JSON.stringify({ lat: "lat" in (await req.clone().json()) ? (await req.clone().json()).lat : "unknown", lng: "lng" in (await req.clone().json()) ? (await req.clone().json()).lng : "unknown" })}`);
    
    const { profile_id, lat, lng } = await req.json() as {
      profile_id?: string;
      lat?: number;
      lng?: number;
    };
    
    // Enhanced input validation
    if (!profile_id || lat == null || lng == null) {
      console.error(`[Google Places] Invalid input: profile_id=${profile_id}, lat=${lat}, lng=${lng}`);
      return new Response(
        JSON.stringify({ 
          error: "profile_id, lat & lng required",
          details: { profile_id: !!profile_id, lat: lat != null, lng: lng != null }
        }),
        { status: 400, headers: CORS },
      );
    }

    // Validate coordinates range
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.error(`[Google Places] Invalid coordinates: lat=${lat}, lng=${lng}`);
      return new Response(
        JSON.stringify({ error: "Invalid coordinates range" }),
        { status: 400, headers: CORS },
      );
    }

    /* ---- 1. server-stored API key --------------------------------- */
    const API_KEY = Deno.env.get("GOOGLE_PLACES_KEY");
    if (!API_KEY) {
      console.error("[Google Places] GOOGLE_PLACES_KEY missing from environment");
      return new Response(
        JSON.stringify({ error: "API key not configured. Please configure GOOGLE_PLACES_KEY in edge function secrets." }), 
        { status: 500, headers: CORS }
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
        { status: 502, headers: CORS }
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
        { status: 403, headers: CORS }
      );
    }
    
    if (gp.status !== "OK" && gp.status !== "ZERO_RESULTS") {
      console.error(`[Google Places] API error: ${gp.status} - ${gp.error_message}`);
      return new Response(
        JSON.stringify({ 
          error: `Google Places API error: ${gp.status}`,
          details: gp.error_message 
        }),
        { status: 502, headers: CORS }
      );
    }

    if (gp.status === "ZERO_RESULTS") {
      console.log(`[Google Places] No results found for location ${lat},${lng}`);
      return new Response(
        JSON.stringify({ ok: true, count: 0, message: "No places found in this area" }),
        { headers: CORS }
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

    return new Response(
      JSON.stringify({ 
        ok: true, 
        count: mapped.length,
        source: "google_places",
        location: { lat, lng }
      }),
      { headers: CORS },
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
      { status: 500, headers: CORS },
    );
  }
});