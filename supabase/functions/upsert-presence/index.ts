
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { geoToH3 } from "https://esm.sh/h3-js@4";
import { checkRateLimitV2 } from "../_shared/helpers.ts";
import { handlePreflight, noContent, badJSON } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: authHeader ? { Authorization: authHeader } : {} } }
    );

    // Verify authentication
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return badJSON("Unauthorized", req, 401);
    }

    // Enhanced Rate limiting for presence updates
    const rateLimitResult = await checkRateLimitV2(supabase, user.id, 'presence_update');
    if (!rateLimitResult.allowed) {
      return badJSON(rateLimitResult.error || "Rate limit exceeded", req, 429);
    }

    const body = await req.json().catch(() => ({}));
    const { vibe, lat, lng, venue_id = null, broadcast_radius = 500 } = body;

    // Validate required parameters
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return badJSON("Valid lat/lng numbers required", req, 400);
    }

    // Calculate H3 index for the location
    const h3_7 = geoToH3(lat, lng, 7);

    // Use the new canonical upsert_presence function
    const { error } = await supabase.rpc('upsert_presence', {
      p_lat: lat,
      p_lng: lng,
      p_vibe: vibe || 'chill',
      p_visibility: 'public'
    });

    if (!error) {
      // Also update the h3_7 column directly since we can't modify the RPC
      await supabase
        .from('vibes_now')
        .update({ h3_7 })
        .eq('profile_id', user.id);
    }

    if (error) {
      console.error("Presence upsert error:", error);
      return badJSON(error.message, req, 500);
    }

    console.log(`Presence updated: ${user.id}${venue_id ? ` → venue ${venue_id}` : venue_id === null ? ' → left venue' : ''}`);

    // Get nearby users using PostGIS function
    const { data: nearby, error: nearbyError } = await supabase.rpc('presence_nearby', {
      lat: lat,
      lng: lng,
      metres: 1000
    });

    if (nearbyError) {
      console.error("Nearby presence error:", nearbyError);
    }

    // Get walkable floqs
    const { data: floqs, error: floqsError } = await supabase.rpc('walkable_floqs', {
      lat: lat,
      lng: lng,
      metres: 1200
    });

    if (floqsError) {
      console.error("Walkable floqs error:", floqsError);
    }

    // Background tasks for progressive vibe auto-update
    const backgroundTasks = [];

    // Track relationships when users are nearby (distance gated for performance)
    if (nearby && nearby.length > 1) { // Only if there are other users
      const relationshipPayload = {
        profile_id: String(user.id),
        nearby_users: nearby.filter(u => u.profile_id !== user.id).map(u => ({
          profile_id: String(u.profile_id),
          distance: u.distance ?? 0,
          vibe: u.vibe ?? 'chill'
        })),
        current_vibe: String(vibe || 'chill'),
        venue_id: venue_id ? String(venue_id) : null,
        timestamp: new Date().toISOString()
      };
      
      backgroundTasks.push(
        supabase.functions.invoke('relationship-tracker', {
          body: relationshipPayload
        }).catch(err => console.error('Relationship tracking failed:', err))
      );
    }

    // Process activity scores for nearby floqs
    if (floqs && floqs.length > 0) {
      const activityEvents = floqs.map(floq => ({
        floq_id: String(floq.id),
        event_type: 'proximity_update' as const,
        profile_id: String(user.id),
        proximity_users: nearby ? nearby.length - 1 : 0, // Exclude self
        vibe: String(vibe || 'chill'),
        timestamp: new Date().toISOString()
      }));

      backgroundTasks.push(
        supabase.functions.invoke('activity-score-processor', {
          body: { events: activityEvents }
        }).catch(err => console.error('Activity scoring failed:', err))
      );
    }

    // Execute background tasks without blocking response
    if (backgroundTasks.length > 0) {
      Promise.allSettled(backgroundTasks).then(results => {
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) {
          console.warn(`${failed}/${results.length} background tasks failed`);
        } else {
          console.log(`All ${results.length} background tasks completed successfully`);
        }
      });
    }

    return noContent(req);

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
