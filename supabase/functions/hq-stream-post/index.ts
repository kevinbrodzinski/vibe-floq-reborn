import { handlePreflight, okJSON, badJSON } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') return badJSON('POST required', req, 405);
    
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

    return okJSON({
      id: data.id,
      receipt: { policy_fingerprint: "hq-stream-post-v1", floq_id }
    }, req);
  } catch (e) {
    return badJSON((e as Error).message, req, 401);
  }
});