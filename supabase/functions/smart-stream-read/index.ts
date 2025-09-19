import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST,OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const { floq_id } = await req.json();
    if (!floq_id) throw new Error("floq_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, 
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication required');
    }

    const nowIso = new Date().toISOString();

    // Upsert the read timestamp with profile_id
    const { error } = await supabase
      .from("floq_stream_reads")
      .upsert(
        { floq_id, profile_id: user.id, last_seen_ts: nowIso },
        { onConflict: "floq_id,profile_id" }
      );

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, last_seen_ts: nowIso }), {
      headers: { ...CORS, "Content-Type":"application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: CORS });
  }
});