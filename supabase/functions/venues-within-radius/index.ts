// Deno runtime • "venues within radius" RPC wrapper
import { serve }        from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";

/* ------------------------------------------------------------------ */
/*  Simple, per-request CORS helper                                   */
/* ------------------------------------------------------------------ */
function buildCors(origin = "*") {
  return {
    "Access-Control-Allow-Origin" : origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type"               : "application/json"
  };
}

/* ------------------------------------------------------------------ */
/*  Edge entry point                                                  */
/* ------------------------------------------------------------------ */
serve(async req => {
  const cors = buildCors(req.headers.get("Origin") ?? "*");

  /* CORS pre-flight ------------------------------------------------- */
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status : 405,
      headers: cors
    });
  }

  try {
    /* Parse request body for location and filters */
    const { 
      lat, 
      lng, 
      radiusM = 1000, 
      limit = 20,
      profileId = null,
      categories = null,
      priceTierMax = '$$$$',
      vibe = null
    } = (await req.json().catch(() => ({}))) as {
      lat?: number;
      lng?: number;
      radiusM?: number;
      limit?: number;
      profileId?: string;
      categories?: string[];
      priceTierMax?: string;
      vibe?: string;
    };

    // Validate required parameters
    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: "lat and lng are required parameters" }), 
        {
          status: 400,
          headers: cors
        }
      );
    }

    /* ----------------------------------------------------------------
       Use the caller's JWT so auth.uid() is available inside the RPC.
       Service-role key is needed only for RLS-bypass reads *outside*
       the RPC – but the RPC itself handles security, so anon is fine.
       -------------------------------------------------------------- */
    const jwt = req.headers.get("Authorization") ?? "";

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,      // keeps RLS open
      { global: { headers: { Authorization: jwt } } } // passes user ctx
    );

    /* ---------------------------------------------------------------
       Use get_venues_in_bbox for now since venues_within_radius 
       doesn't exist yet. Convert radius to bounding box.
       ------------------------------------------------------------- */
    
    // Convert radius to approximate lat/lng degrees  
    const latDegrees = radiusM / 111000; // ~111km per degree
    const lngDegrees = radiusM / (111000 * Math.cos(lat * Math.PI / 180));
    
    const { data, error } = await sb.rpc("get_venues_in_bbox", {
      west: lng - lngDegrees,
      south: lat - latDegrees,
      east: lng + lngDegrees,
      north: lat + latDegrees
    });

    if (error) {
      console.error("[venues-within-radius] RPC error", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status : 500,
        headers: cors
      });
    }

    return new Response(JSON.stringify(data), {
      status : 200,
      headers: { ...cors, "Cache-Control": "max-age=30" }
    });
  } catch (e) {
    console.error("[venues-within-radius] fatal", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status : 500,
      headers: cors
    });
  }
});