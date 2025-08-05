// Deno runtime • Foursquare Nearby → integrations.place_feed_raw
import { serve }        from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";
import { corsHeaders, respondWithCors } from "../_shared/cors.ts";
import { mapToVenue, upsertVenues } from "../_shared/venues.ts";


serve(async (req) => {
  // Handle CORS preflight requests FIRST
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204, 
      headers: { 
        ...corsHeaders, 
        "Content-Length": "0" 
      } 
    });
  }
  
  if (req.method !== "POST") {
    return respondWithCors({ error: "Method not allowed" }, 405);
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
      return respondWithCors({ 
        error: "lat & lng are required numbers",
        details: { lat: Number.isFinite(lat), lng: Number.isFinite(lng) }
      }, 400);
    }

    // Validate coordinates range
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.error(`[Foursquare] Invalid coordinates range: lat=${lat}, lng=${lng}`);
      return respondWithCors({ 
        error: "Invalid coordinates range",
        details: "Latitude must be between -90 and 90, longitude between -180 and 180"
      }, 400);
    }

    /* ---- 1. server-stored FSQ key with debug info --------------------------------- */
    console.log('[DEBUG] FSQ key len:', (Deno.env.get('FSQ_SERVICE_KEY')||'').length);
    const API_KEY = Deno.env.get("FSQ_SERVICE_KEY");
    if (!API_KEY) {
      console.error("[Foursquare] FSQ_SERVICE_KEY missing from environment");
      return respondWithCors({ error: "API key not configured. Please configure FSQ_SERVICE_KEY in edge function secrets." }, 500);
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
      
      // Safely get error text without assuming JSON format
      let errorText = "";
      try {
        errorText = await response.text();
        console.error(`[Foursquare] Error response body: ${errorText}`);
      } catch (readError) {
        console.error(`[Foursquare] Could not read error response:`, readError);
        errorText = "Could not read error response";
      }
      
      if (response.status === 401) {
        return respondWithCors({ 
          error: "Foursquare API authentication failed. Please check your API key.",
          details: "API key may be invalid or expired"
        }, 401);
      }
      
      return respondWithCors({ 
        error: `Foursquare API HTTP error: ${response.status}`,
        details: errorText
      }, 502);
    }

    const fsq = await response.json();
    console.log(`[Foursquare] API Response received, results count: ${fsq.results?.length || 0}`);

    if (fsq.message) {
      console.error(`[Foursquare] API error message: ${fsq.message}`);
      return respondWithCors({ 
        error: "Foursquare API error",
        details: fsq.message 
      }, 502);
    }

    if (!fsq.results || fsq.results.length === 0) {
      console.log(`[Foursquare] No results found for location ${lat},${lng}`);
      return respondWithCors({ ok: true, count: 0, message: "No places found in this area" });
    }

    /* ---- 3. transform + upsert venues ----------------------------- */
    console.log(`[Foursquare] Transforming ${fsq.results.length} results`);
    const mapped = fsq.results.map((r: any) => {
      try {
        // Skip venues with missing coordinates - don't use fallback
        if (!r?.geocodes?.main?.latitude || !r?.geocodes?.main?.longitude) {
          console.warn(`[Foursquare] Skipped venue without coords: ${r?.fsq_id}`);
          return null;
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

    return respondWithCors({ 
      ok: true, 
      count: mapped.length,
      source: "foursquare",
      location: { lat, lng }
    });
  } catch (e) {
    console.error("[Foursquare] Unexpected error:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return respondWithCors({ 
      error: "Internal server error",
      details: errorMessage,
      source: "foursquare"
    }, 500);
  }
});