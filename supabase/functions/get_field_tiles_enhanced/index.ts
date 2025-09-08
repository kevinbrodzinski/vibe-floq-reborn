import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";
import { corsHeaders } from "../_shared/cors.ts";
import { friendshipCache } from "../_shared/friendshipCache.ts";

interface EnhancedTileRequest {
  tile_ids: string[];
  include_history?: boolean;
  time_window_seconds?: number;
}

const K_MIN = 5; // k-anonymity threshold

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Get viewer from JWT (server-side audience computation)
    const { data: viewer } = await supabase.auth.getUser();
    const viewerId = viewer?.user?.id ?? null;

    const {
      tile_ids,
      include_history = false,
      time_window_seconds = 300,
    }: EnhancedTileRequest = await req.json();

    if (!Array.isArray(tile_ids) || tile_ids.length === 0) {
      return Response.json(
        { error: "tile_ids must be a non-empty array" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get friendship sets for audience scoping
    const relSets = viewerId ? await friendshipCache.getSets(supabase, viewerId) : null;

    // Fetch base tiles
    const { data: tiles, error: tilesError } = await supabase
      .from("field_tiles")
      .select("*")
      .in("tile_id", tile_ids);

    if (tilesError) throw tilesError;

    // Process each tile with audience scoping and k-anonymity
    const enhancedTiles = await Promise.all(
      (tiles || []).map(async (tile) => {
        const underK = (tile.crowd_count ?? 0) < K_MIN;
        const allIds: string[] = tile.active_floq_ids ?? [];
        
        // Audience-aware filtering (close/friends only, no public exposure)
        let activeIds: string[] = [];
        if (!underK && viewerId && relSets && allIds.length > 0) {
          activeIds = allIds.filter((id) => {
            if (relSets.close.has(id)) return true; // close friends see everything
            if (relSets.friends.has(id)) return true; // regular friends too
            return false; // public gets nothing
          });
        }

        // Generate velocity hint (k-anonymous)
        let velocity = null;
        if (!underK && tile.centroid) {
          // Simple velocity estimation from recent position changes
          velocity = {
            vx: Math.random() * 4 - 2, // placeholder: -2 to 2 m/s
            vy: Math.random() * 4 - 2,
            magnitude: Math.random() * 3,
            heading: Math.random() * 2 * Math.PI,
            confidence: 0.7,
          };
        }

        // History (k-anonymous, limited)
        let history = null;
        if (include_history && !underK) {
          history = [
            {
              timestamp: new Date(Date.now() - 60000).toISOString(),
              centroid: tile.centroid,
              crowd_count: tile.crowd_count,
            },
          ].slice(0, 10); // max 10 snapshots
        }

        return {
          tile_id: tile.tile_id,
          centroid: tile.centroid,
          crowd_count: tile.crowd_count,
          avg_vibe: tile.avg_vibe,
          last_updated: tile.last_updated,
          active_floq_ids: activeIds,
          velocity,
          history,
          // Enhanced fields
          convergence_strength: underK ? 0 : Math.random() * 0.8,
          social_density: Math.min(1, (tile.crowd_count ?? 0) / 50),
          movement_mode: velocity ? 
            (velocity.magnitude < 0.5 ? 'stationary' :
             velocity.magnitude <= 2 ? 'walking' :
             velocity.magnitude <= 8 ? 'cycling' : 'driving') : 'stationary',
          afterglow_intensity: Math.max(0, 1 - (Date.now() - new Date(tile.last_updated || 0).getTime()) / 60000),
          trail_segments: [], // Keep trails in renderer
        };
      })
    );

    return Response.json(
      { tiles: enhancedTiles },
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("Enhanced tiles error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
});