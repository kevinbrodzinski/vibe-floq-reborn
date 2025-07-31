// Deno runtime • "get social suggestions" RPC wrapper
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
    /* body is optional – we only care about an optional radius param */
    const { radius = 1_000, limit = 5 } =
      (await req.json().catch(() => ({}))) as
        { radius?: number; limit?: number };

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
       Call the SQL function:

         CREATE FUNCTION public.get_social_suggestions(
             p_profile_id uuid DEFAULT auth.uid(),
             max_dist_m   integer,
             limit_n      integer)

       We let SQL default p_profile_id by passing `null`.
       ------------------------------------------------------------- */
    const { data, error } = await sb.rpc("get_social_suggestions", {
      p_profile_id: null,        // ⇠ use auth.uid() inside the function
      max_dist_m  : radius,
      limit_n     : limit
    });

    if (error) {
      console.error("[get-social-suggestions] RPC error", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status : 500,
        headers: cors
      });
    }

    return new Response(JSON.stringify(data), {
      status : 200,
      headers: { ...cors, "Cache-Control": "max-age=10" }
    });
  } catch (e) {
    console.error("[get-social-suggestions] fatal", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status : 500,
      headers: cors
    });
  }
});