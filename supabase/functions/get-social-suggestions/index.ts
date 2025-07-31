// supabase/functions/get_social_suggestions/index.ts
import { serve }        from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";

// --- single-file CORS helper ---------------------------------------
function buildCors(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json",
  } as const;
}
// --------------------------------------------------------------------

serve(async (req) => {
  const cors = buildCors(req.headers.get("Origin") ?? "*");

  /* pre-flight */
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "POST only" }),
      { status: 405, headers: cors });

  try {
    // body can be empty; suggestions use auth.uid() inside the RPC
    const { radius = 1000 } = await req.json().catch(() => ({}));

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // SR to bypass RLS
      { auth: { persistSession: false } },
    );

    const { data, error } = await sb.rpc("get_social_suggestions", {
      max_dist_m: radius,
      limit_n   : 5,
    });

    if (error) {
      console.error("[get-social-suggestions] RPC error", error);
      return new Response(JSON.stringify({ error: error.message }),
        { status: 500, headers: cors });
    }

    return new Response(JSON.stringify(data),
      { status: 200, headers: { ...cors, "Cache-Control": "max-age=10" } });
  } catch (e) {
    console.error("[get-social-suggestions] fatal", e);
    return new Response(JSON.stringify({ error: "internal" }),
      { status: 500, headers: cors });
  }
});