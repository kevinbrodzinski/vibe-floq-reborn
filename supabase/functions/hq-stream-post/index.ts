import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { corsHeaders, handlePreflight } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  
  const origin = req.headers.get('origin');

  try {
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const { data: auth } = await admin.auth.getUser(jwt);
    const userId = auth.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const { floq_id, body, kind = "text" } = await req.json();
    if (!floq_id || !body) throw new Error("Missing floq_id or body");

    // membership check
    const { data: member } = await admin
      .from("floq_participants")
      .select("profile_id")
      .eq("floq_id", floq_id)
      .eq("profile_id", userId)
      .maybeSingle();

    if (!member) throw new Error("Not a member of this floq");

    const { data, error } = await admin
      .from("floq_messages")
      .insert({ 
        floq_id,
        sender_id: userId, 
        body
      })
      .select("id")
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({
      id: data.id,
      receipt: { policy_fingerprint: "hq-stream-post-v1", floq_id }
    }), { headers: { "Content-Type": "application/json", ...corsHeaders(origin) }});
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) }
    });
  }
});