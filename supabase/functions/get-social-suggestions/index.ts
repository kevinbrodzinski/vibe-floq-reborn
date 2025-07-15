import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const jwt = req.headers.get("Authorization") ?? "";
    const url = new URL(req.url);

    const radius = parseInt(url.searchParams.get("radius") ?? "1000", 10);
    // we don't actually need lat/lng here because the RPC uses the caller's vibe row.
    // but you might want them for analytics:
    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: jwt } } }
    );

    const { data, error } = await supabase
      .rpc("get_social_suggestions", { me: null, max_dist_m: radius });

    if (error) {
      console.error("[get-social-suggestions]", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "max-age=10" },
    });
  } catch (err) {
    console.error("[get-social-suggestions] unexpected", err);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});