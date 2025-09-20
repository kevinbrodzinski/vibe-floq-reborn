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

    // Forward auth
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: authHeader ? { Authorization: authHeader } : {} } }
    );

    // Auth user
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return badJSON("Unauthorized", req, 401);

    // Enhanced Rate limiting for presence updates
    const rateLimitResult = await checkRateLimitV2(supabase, user.id, 'presence_update');
    if (!rateLimitResult.allowed) {
      return badJSON(rateLimitResult.error || "Rate limit exceeded", req, 429);
    }

    // Body validation
    const body = await req.json().catch(() => ({}));
    const { vibe = 'chill', lat, lng, venue_id = null, broadcast_radius = 500 } = body;
    
    if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
      return badJSON("Valid lat/lng numbers required", req, 400);
    }

    // H3 cell
    const h3_7 = latLngToCell(lat, lng, H3_RES);

    // RPC upsert
    const { error } = await supabase.rpc('upsert_presence', {
      p_lat: lat, p_lng: lng, p_vibe: vibe, p_visibility: 'public'
    });

    if (error) {
      console.error("Presence upsert error:", error);
      return badJSON(error.message, req, 500);
    }

    // Secondary: write h3_7 directly
    await supabase.from('vibes_now').update({ h3_7 }).eq('profile_id', user.id);

    console.log(`Presence updated: ${user.id}${venue_id ? ` → venue ${venue_id}` : venue_id === null ? ' → left venue' : ''}`);

    // Background tasks (non-blocking)
    const backgroundTasks = [];

    // Get nearby users using PostGIS function
    const nearbyP = supabase.rpc('presence_nearby', {
      lat: lat,
      lng: lng,
      metres: 1000
    }).catch(err => console.error('presence_nearby failed', err));

    // Get walkable floqs
    const floqsP = supabase.rpc('walkable_floqs', {
      lat: lat,
      lng: lng,
      metres: 1200
    }).catch(err => console.error('walkable_floqs failed', err));

    backgroundTasks.push(nearbyP, floqsP);

    // Execute background tasks without blocking response
    Promise.allSettled(backgroundTasks).then(results => {
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        console.warn(`${failed}/${results.length} background tasks failed`);
      } else {
        console.log(`All ${results.length} background tasks completed successfully`);
      }
    });

    // ✅ Return 200 JSON so client treats as success
    return okJSON({ ok: true, profile_id: user.id, h3_7, venue_id }, req);

  } catch (error) {
    console.error("Presence function error:", error);
    
    // Track critical errors in PostHog
    try {
      const posthogKey = Deno.env.get("POSTHOG_PUBLIC_KEY");
      if (posthogKey && Deno.env.get("DEV") !== "true") {
        await fetch('https://app.posthog.com/capture/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Keep-Alive': 'timeout=5' },
          body: JSON.stringify({
            api_key: posthogKey,
            event: 'presence_ws_error',
            properties: {
              msg: (error as Error).message,
              code: (error as any).code ?? null,
            },
          }),
          keepalive: true,
        }).catch(() => {/* silent */});
      }
    } catch (analyticsError) {
      console.debug('Analytics tracking failed:', analyticsError);
    }
    
    return badJSON((error as Error).message, req, 500);
  }
});