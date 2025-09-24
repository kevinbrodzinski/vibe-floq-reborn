import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { corsHeadersFor, handlePreflight } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const { floq_id } = await req.json();
    if (!floq_id) throw new Error("floq_id required");

    const { data: members, error: mErr } = await admin
      .from("floq_participants").select("profile_id").eq("floq_id", floq_id);
    if (mErr) throw mErr;
    const ids = (members ?? []).map(m => m.profile_id);
    if (!ids.length) return json(req, { per_member: [], consensus: { vibe: null, match_pct: 0 } });

    const { data: vibes, error: vErr } = await admin
      .from("vibes_now").select("profile_id, vibe").in("profile_id", ids);
    if (vErr) throw vErr;

    const per_member = vibes ?? [];
    if (!per_member.length) return json(req, { per_member, consensus: { vibe: null, match_pct: 0 } });

    const counts = new Map<string, number>();
    for (const v of per_member) {
      const key = String(v.vibe ?? "unknown").toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let top: string | null = null; let topCount = 0;
    counts.forEach((c, k) => { if (c > topCount) { topCount = c; top = k; }});

    const match_pct = per_member.length ? (topCount / per_member.length) : 0;
    return json(req, { per_member, consensus: { vibe: top, match_pct } });
  } catch (e) {
    return json(req, { error: (e as Error).message }, 500);
  }
});

function json(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json", ...corsHeadersFor(req) }
  });
}