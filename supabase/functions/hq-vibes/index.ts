import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { floq_id } = await req.json();
    return new Response(JSON.stringify({
      per_member: [],
      consensus: { vibe: null, match_pct: 0 },
      receipt: { policy_fingerprint: "hq-vibes-v1", floq_id }
    }), { headers: { "Content-Type": "application/json", ...corsHeaders }});
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});