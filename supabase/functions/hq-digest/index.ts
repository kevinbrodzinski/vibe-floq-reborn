import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { floq_id, since, categories } = await req.json();
    const now = new Date().toISOString();
    const summary = { decisions: [], rallies: [], mentions: [], plans: [] };
    const receipt = { policy_fingerprint: "hq-digest-v1", since: since ?? null, categories: categories ?? null };

    return new Response(JSON.stringify({
      summary,
      last_digest_at: now,
      receipt
    }), { headers: { "Content-Type": "application/json", ...corsHeaders }});
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});