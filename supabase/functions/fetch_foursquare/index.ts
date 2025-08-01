// Deno runtime • Foursquare Nearby → integrations.place_feed_raw
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
    console.log(`[Foursquare] Starting request for location`);
    
    const { profile_id, lat, lng } = await req.json() as {
      profile_id?: string;
      lat?: number;
      lng?: number;
    };
    
    // Enhanced input validation - profile_id is now optional
    if (lat == null || lng == null) {
      console.error(`[Foursquare] Invalid input: profile_id=${profile_id}, lat=${lat}, lng=${lng}`);
      return new Response(
        JSON.stringify({ 
          error: "lat & lng required",
          details: { profile_id: !!profile_id, lat: lat != null, lng: lng != null }
        }),
        { status: 400, headers: CORS },
      );
    }

    // Validate coordinates range
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.error(`[Foursquare] Invalid coordinates: lat=${lat}, lng=${lng}`);
      return new Response(
        JSON.stringify({ error: "Invalid coordinates range" }),
        { status: 400, headers: CORS },
      );
    }

    /* ---- 1. server-stored FSQ key --------------------------------- */
    const API_KEY = Deno.env.get("FOURSQUARE_ADMIN_API");
    if (!API_KEY) {
      console.error("[Foursquare] FOURSQUARE_ADMIN_API missing from environment");
      return new Response(
        JSON.stringify({ error: "API key not configured. Please configure FOURSQUARE_ADMIN_API in edge function secrets." }), 
        { status: 500, headers: CORS }
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
          { status: 401, headers: CORS }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Foursquare API HTTP error: ${response.status}`,
          details: errorText
        }),
        { status: 502, headers: CORS }
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
        { status: 502, headers: CORS }
      );
    }

    if (!fsq.results || fsq.results.length === 0) {
      console.log(`[Foursquare] No results found for location ${lat},${lng}`);
      return new Response(
        JSON.stringify({ ok: true, count: 0, message: "No places found in this area" }),
        { headers: CORS }
      );
    }

    /* ---- 3. transform + upsert venues ----------------------------- */
    console.log(`[Foursquare] Transforming ${fsq.results.length} results`);
    const mapped = fsq.results.map((r: any) => {
      try {
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

    return new Response(
      JSON.stringify({ 
        ok: true, 
        count: mapped.length,
        source: "foursquare",
        location: { lat, lng }
      }),
      { headers: CORS },
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
      { status: 500, headers: CORS },
    );
  }
});