import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor, handlePreflight } from "../_shared/cors.ts";
import { friendshipCache } from "../_shared/friendshipCache.ts";

// ---- constants
const K_MIN = 5;

Deno.serve(async (req) => {
  // CORS preflight
  const pf = handlePreflight(req);
  if (pf) return pf;
  const headers = { ...corsHeadersFor(req), "Content-Type": "application/json", "Cache-Control": "no-store" };

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    // viewer identity
    const { data: viewerRes } = await supabase.auth.getUser();
    const viewerId = viewerRes?.user?.id ?? null;

    const body = await req.json().catch(() => ({}));
    const tile_ids: string[] = Array.isArray(body.tile_ids) ? body.tile_ids.slice(0, 250) : [];
    const include_history: boolean = !!body.include_history;
    const time_window_seconds: number = Number.isFinite(body.time_window_seconds) ? body.time_window_seconds : 300;

    if (!tile_ids.length) {
      return new Response(JSON.stringify({ tiles: [] }), { headers, status: 200 });
    }

    // relationship sets (cached)
    const relSets = viewerId ? await friendshipCache.getSets(supabase, viewerId) : { close: new Set<string>(), friends: new Set<string>() };

    const sinceIso = new Date(Date.now() - time_window_seconds * 1000).toISOString();

    // base fetch (only needed fields; adjust if you store centroid_lat/lng)
    const { data, error } = await supabase
      .from("field_tiles")
      .select("tile_id,crowd_count,avg_vibe,active_floq_ids,updated_at,centroid") // centroid: geojson Point or object
      .in("tile_id", tile_ids)
      .gte("updated_at", sinceIso);

    if (error) throw error;

    // Group rows by tile_id, newest first
    const byId = new Map<string, any[]>();
    (data ?? []).forEach(r => (byId.get(r.tile_id) ?? byId.set(r.tile_id, []).get(r.tile_id))?.push(r));
    byId.forEach(a => a.sort((x, y) => new Date(y.updated_at).getTime() - new Date(x.updated_at).getTime()));

    const tiles = tile_ids.map(id => {
      const arr = byId.get(id) ?? [];
      const curr = arr[0];
      if (!curr) return null;

      const underK = (curr.crowd_count ?? 0) < K_MIN;

      // history (small, k-anon)
      const history = include_history && !underK
        ? arr.slice(0, 10).map((r: any) => ({
            timestamp: r.updated_at,
            crowd_count: r.crowd_count ?? 0,
            centroid: parseCentroid(r),
            vibe: r.avg_vibe as { h: number; s: number; l: number }
          }))
        : undefined;

      // velocity hint from last two samples (only if k≥5 and history≥2)
      let velocity;
      if (!underK && history && history.length >= 2) {
        velocity = velocityFromSamples(history[0], history[1]);
      }

      // audience-scoped floq ids
      const allIds: string[] = curr.active_floq_ids ?? [];
      let active_floq_ids: string[] = [];
      if (!underK && viewerId && allIds.length) {
        // close ⊂ friends
        active_floq_ids = allIds.filter(id => relSets.close.has(id) || relSets.friends.has(id));
      }

      // afterglow
      const afterglow_intensity = ((): number => {
        const age = Math.max(0, Date.now() - new Date(curr.updated_at).getTime()) / 1000;
        const freshness = Math.max(0, 1 - age / 60);
        const crowdNorm = Math.min(1, (curr.crowd_count ?? 0) / 50);
        return freshness * crowdNorm;
      })();

      return {
        tile_id: curr.tile_id,
        crowd_count: curr.crowd_count ?? 0,
        avg_vibe: curr.avg_vibe as { h: number; s: number; l: number },
        active_floq_ids,
        updated_at: curr.updated_at,
        centroid: parseCentroid(curr),
        velocity,
        movement_mode: velocity ? movementFromSpeed(velocity.magnitude) : 'stationary',
        history,
        momentum: undefined,                // client/worker computes
        cohesion_score: undefined,         // client/worker computes
        convergence_vector: null,          // worker computes in pixel space
        afterglow_intensity,
        trail_segments: []                 // renderer handles trails
      };
    }).filter(Boolean);

    return new Response(JSON.stringify({ tiles }), { headers, status: 200 });

  } catch (e) {
    console.error('[get_field_tiles_enhanced]', e);
    return new Response(JSON.stringify({ tiles: [], error: 'internal' }), { headers, status: 500 });
  }
});

/** util: centroid parser */
function parseCentroid(row: any): { lat: number; lng: number } {
  const c = row.centroid;
  if (!c) return { lat: 0, lng: 0 };
  if (typeof c === 'string') {
    try {
      const g = JSON.parse(c);
      if (g?.type === 'Point' && Array.isArray(g.coordinates)) return { lng: g.coordinates[0], lat: g.coordinates[1] };
    } catch {}
  }
  if (c.type === 'Point' && Array.isArray(c.coordinates)) return { lng: c.coordinates[0], lat: c.coordinates[1] };
  if (typeof c.x === 'number' && typeof c.y === 'number') return { lat: c.y, lng: c.x };
  return { lat: 0, lng: 0 };
}

/** util: velocity from two samples */
function velocityFromSamples(curr: any, prev: any) {
  const dt = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
  if (dt <= 0 || !isFinite(curr.centroid.lat) || !isFinite(curr.centroid.lng) ||
               !isFinite(prev.centroid.lat) || !isFinite(prev.centroid.lng)) return undefined;
  
  const dx = (curr.centroid.lng - prev.centroid.lng) * 111320 * Math.cos(curr.centroid.lat * Math.PI / 180);
  const dy = (curr.centroid.lat - prev.centroid.lat) * 111320;
  const vx = dx / dt;
  const vy = dy / dt;
  const magnitude = Math.sqrt(vx * vx + vy * vy);
  const heading = Math.atan2(vx, vy);
  return { vx, vy, magnitude, heading, confidence: 0.8 };
}

/** util: movement mode from speed */
function movementFromSpeed(speed: number): string {
  if (speed < 0.5) return 'stationary';
  if (speed <= 2) return 'walking';
  if (speed <= 8) return 'cycling';
  if (speed <= 30) return 'driving';
  return 'transit';
}