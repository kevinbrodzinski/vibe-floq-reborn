// Deno runtime • "get social suggestions" RPC wrapper
import { serve }        from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";

// Use modern CORS pattern
import { handlePreflight, okJSON, badJSON } from "../_shared/cors.ts";

/* ------------------------------------------------------------------ */
/*  Edge entry point                                                  */
/* ------------------------------------------------------------------ */
serve(async req => {
  /* CORS pre-flight ------------------------------------------------- */
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return badJSON("POST only", 405);
  }

  try {
    /* Parse request body for location and filters */
    const { 
      lat, 
      lng, 
      radiusKm = 1, 
      limit = 10,
      vibe = null,
      activity = null,
      groupSize = null 
    } = (await req.json().catch(() => ({}))) as {
      lat?: number;
      lng?: number;
      radiusKm?: number;
      limit?: number;
      vibe?: string;
      activity?: string;
      groupSize?: number;
    };

    // Validate required parameters
    if (!lat || !lng) {
      return badJSON("lat and lng are required parameters", 400);
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
       Call the get_social_suggestions RPC function:
       
       get_social_suggestions(
         p_lat numeric,
         p_lng numeric, 
         p_radius_km numeric DEFAULT 1,
         p_limit integer DEFAULT 10,
         p_vibe text DEFAULT NULL,
         p_activity text DEFAULT NULL,
         p_group_size integer DEFAULT NULL,
         p_profile_id uuid DEFAULT auth.uid()
       )
       ------------------------------------------------------------- */
    const { data, error } = await sb.rpc("get_social_suggestions", {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radiusKm,
      p_limit: limit,
      p_vibe: vibe,
      p_activity: activity,
      p_group_size: groupSize
      // p_profile_id will use auth.uid() default
    });

    if (error) {
      console.error("[get-social-suggestions] RPC error", error);
      return badJSON(error.message, 500);
    }

    return okJSON(data, { "Cache-Control": "max-age=10" });
  } catch (e) {
    console.error("[get-social-suggestions] fatal", e);
    return badJSON("internal", 500);
  }
});