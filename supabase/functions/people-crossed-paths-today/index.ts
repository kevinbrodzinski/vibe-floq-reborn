// Deno runtime • "people crossed paths today" RPC wrapper
import { serve }        from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";
import { checkRateLimitV2, createErrorResponse } from "../_shared/helpers.ts";

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
    /* Parse request body for crossed paths parameters */
    const { 
      profileId = null,
      proximityMeters = 25
    } = (await req.json().catch(() => ({}))) as {
      profileId?: string;
      proximityMeters?: number;
    };

    /* ----------------------------------------------------------------
       Create Supabase client with user JWT for authentication & rate limiting
       -------------------------------------------------------------- */
    const jwt = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: jwt } } }
    );

    // Verify authentication and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: cors
      });
    }

    /* Enhanced Rate limiting for proximity queries */
    const rateLimitResult = await checkRateLimitV2(supabase, user.id, 'proximity_query');
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ error: rateLimitResult.error || "Rate limit exceeded" }), {
        status: 429,
        headers: cors
      });
    }

    /* ----------------------------------------------------------------
       Call the people_crossed_paths_today function:
       
       people_crossed_paths_today(
         in_me uuid,
         proximity_meters integer
       )
       ------------------------------------------------------------- */
    const { data, error } = await supabase.rpc("people_crossed_paths_today", {
      in_me: profileId,
      proximity_meters: proximityMeters
    });

    if (error) {
      console.error("[people-crossed-paths-today] RPC error", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status : 500,
        headers: cors
      });
    }

    return new Response(JSON.stringify(data || []), {
      status : 200,
      headers: { ...cors, "Cache-Control": "max-age=60" }
    });
  } catch (e) {
    console.error("[people-crossed-paths-today] fatal", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status : 500,
      headers: cors
    });
  }
});