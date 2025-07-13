
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Verify authentication
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { vibe, lat, lng, venue_id = null, broadcast_radius = 500 } = body;

    const updateData: any = {
      user_id: user.id,
      location: `POINT(${lng} ${lat})`,
      broadcast_radius,
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90_000).toISOString()
    };

    // Set venue_id if provided
    if (venue_id !== undefined) {
      updateData.venue_id = venue_id;
    }
    
    // Only set vibe if explicitly provided (don't clear on venue leave)
    if (vibe !== undefined && vibe !== null) {
      updateData.vibe = vibe;
    }

    console.log(`Presence updated: ${user.id}${venue_id ? ` → venue ${venue_id}` : venue_id === null ? ' → left venue' : ''}`);

    // Upsert presence with PostGIS point and optional venue_id
    const { error } = await supabase
      .from("vibes_now")
      .upsert(updateData);

    if (error) {
      console.error("Presence upsert error:", error);
      
      // Track critical database errors
      try {
        const posthogKey = Deno.env.get("POSTHOG_PUBLIC_KEY");
        if (posthogKey && Deno.env.get("DEV") !== "true") {
          await fetch('https://app.posthog.com/capture/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Keep-Alive': 'timeout=5' },
            body: JSON.stringify({
              api_key: posthogKey,
              event: 'presence_upsert_error',
              properties: {
                msg: error.message,
                code: error.code ?? null,
              },
            }),
            keepalive: true,
          }).catch(() => {/* silent */});
        }
      } catch (analyticsError) {
        console.debug('Analytics tracking failed:', analyticsError);
      }
      
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get nearby users using PostGIS function (now includes self by default)
    const { data: nearby, error: nearbyError } = await supabase.rpc('presence_nearby', {
      lat: lat,
      lng: lng,
      km: 1.0,
      include_self: true
    });

    if (nearbyError) {
      console.error("Nearby presence error:", nearbyError);
    }

    // Get walkable floqs
    const { data: floqs, error: floqsError } = await supabase.rpc('get_walkable_floqs', {
      user_lat: lat,
      user_lng: lng,
      max_walk_meters: 1200
    });

    if (floqsError) {
      console.error("Walkable floqs error:", floqsError);
    }

    // Background tasks for progressive vibe auto-update
    const backgroundTasks = [];

    // Track relationships when users are nearby (distance gated for performance)
    if (nearby && nearby.length > 1) { // Only if there are other users
      backgroundTasks.push(
        supabase.functions.invoke('relationship-tracker', {
          body: {
            user_id: user.id,
            nearby_users: nearby.filter(u => u.user_id !== user.id),
            current_vibe: vibe || updateData.vibe,
            venue_id: venue_id
          }
        }).catch(err => console.error('Relationship tracking failed:', err))
      );
    }

    // Process activity scores for nearby floqs
    if (floqs && floqs.length > 0) {
      const activityEvents = floqs.map(floq => ({
        floq_id: floq.id,
        event_type: 'proximity_update' as const,
        user_id: user.id,
        proximity_users: nearby ? nearby.length - 1 : 0, // Exclude self
        vibe: vibe || updateData.vibe
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

    return new Response(null, { status: 204, headers: corsHeaders });

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
    
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
