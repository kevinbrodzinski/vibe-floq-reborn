import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { corsHeadersFor, handlePreflight } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

type Av = { profile_id: string; status: "free"|"soon"|"busy"|"ghost"; until_at?: string };

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const { floq_id } = await req.json();
    if (!floq_id) throw new Error("floq_id required");

    // members
    const { data: members, error: mErr } = await admin
      .from("floq_participants").select("profile_id").eq("floq_id", floq_id);
    if (mErr) throw mErr;
    const ids = (members ?? []).map(m => m.profile_id);
    if (!ids.length) return json(req, { availability: [] });

    // online status + last seen
    const { data: online, error: oErr } = await admin
      .from("user_online_status")
      .select("profile_id, is_online, last_seen")
      .in("profile_id", ids);
    if (oErr) throw oErr;

    // optional: look at current vibes (could infer "busy" if productivity/high-focus)
    const { data: vibes } = await admin
      .from("vibes_now")
      .select("profile_id, vibe")
      .in("profile_id", ids);

    const availability: Av[] = ids.map(pid => {
      const os = online?.find(x => x.profile_id === pid);
      const vb = vibes?.find(x => x.profile_id === pid)?.vibe ?? null;

      if (!os) return { profile_id: pid, status: "ghost" };
      if (os.is_online) {
        // if vibe suggests high focus, mark busy, else free
        if (vb && ["productive","focus","deep"].includes(String(vb).toLowerCase())) {
          return { profile_id: pid, status: "busy" };
        }
        return { profile_id: pid, status: "free" };
      }
      if (!os.is_online && os.last_seen) {
        const mins = (Date.now() - new Date(os.last_seen).getTime()) / 60000;
        if (mins < 15) return { profile_id: pid, status: "soon" };
      }
      return { profile_id: pid, status: "ghost" };
    });

    return json(req, { availability });
  } catch (e) {
    return json(req, { error: (e as Error).message }, 500);
  }
});

function json(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeadersFor(req) }
  });
}