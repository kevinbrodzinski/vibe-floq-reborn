import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { latLngToCell } from "npm:h3-js";
import { checkRateLimitV2 } from "../_shared/helpers.ts";
import { handlePreflight, okJSON, badJSON } from "../_shared/cors.ts";

const H3_RES = 7;

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    if (req.method !== 'POST') return badJSON('POST required', req, 405);

    // Forward auth to supabase client
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: authHeader ? { Authorization: authHeader } : {} } }
    );

    // Auth user
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return badJSON("Unauthorized", req, 401);

    // Body validation
    const body = await req.json().catch(() => ({}));
    const { vibe = 'chill', lat, lng, venue_id = null, visibility = 'public' } = body;
    if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
      return badJSON("Valid lat/lng numbers required", req, 400);
    }

    // Rate limit
    const rl = await checkRateLimitV2(supabase, user.id, 'presence_update');
    if (!rl.allowed) {
      // 👇 Soft success to avoid red banners/blank preview; client will backoff
      return okJSON({ ok:false, reason:'rate_limit', retryAfterSec: rl.retryAfter ?? 15 }, req, 200);
    }

    // H3 cell
    const h3_7 = latLngToCell(lat, lng, H3_RES);

    // RPC upsert
    const { error } = await supabase.rpc('upsert_presence', {
      p_lat: lat, p_lng: lng, p_vibe: vibe, p_visibility: visibility
    });
    if (error) {
      console.error("Presence upsert error:", error);
      return badJSON(error.message, req, 500);
    }

    // Secondary: write h3_7 directly
    await supabase.from('vibes_now').update({ h3_7 }).eq('profile_id', user.id);

    // ✅ Always 200 JSON on success
    return okJSON({ ok:true, profile_id: user.id, h3_7, venue_id }, req);

  } catch (error) {
    console.error("Presence function error:", error);
    return badJSON((error as Error).message, req, 500);
  }
});