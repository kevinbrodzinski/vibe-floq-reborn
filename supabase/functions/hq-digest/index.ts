import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { floq_id, since } = await req.json();
    if (!floq_id) throw new Error("floq_id required");
    const sinceIso = since ?? new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

    const { data: msgs, error } = await admin
      .from("floq_messages")
      .select("id, created_at")
      .eq("floq_id", floq_id)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const summary = {
      total: (msgs ?? []).length,
      recent: (msgs ?? []).filter(m => new Date(m.created_at) > new Date(Date.now() - 60*60*1000)).length,
      messages: msgs ?? [],
    };

    return new Response(JSON.stringify({
      summary,
      last_digest_at: new Date().toISOString(),
      receipt: { policy_fingerprint: "hq-digest-v1", since: sinceIso }
    }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});