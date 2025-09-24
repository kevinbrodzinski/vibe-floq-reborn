// Aggregates presence tiles → {h3, energy, slope, volatility}. No PII.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function ok(b: unknown) {
  return new Response(JSON.stringify(b), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, s-maxage=15, max-age=15",
      "access-control-allow-origin": "*",
    }
  });
}
function bad(m: string, c = 400) {
  return new Response(JSON.stringify({ error: m }), {
    status: c,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return ok({});
  if (req.method !== "POST") return bad("POST required", 405);

  const { bbox, zoom = 14, res = 9 } = await req.json().catch(() => ({}));
  if (!bbox || !Array.isArray(bbox) || bbox.length !== 4) return bad("bbox required [w,s,e,n]");

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  
  // Use existing field_tiles_v2 table and convert to energy/slope/volatility format
  const { data, error } = await supabase
    .from('field_tiles_v2')
    .select('tile_id, center_lat, center_lng, crowd_count, avg_vibe, vibe_mix, updated_at')
    .gte('center_lng', bbox[0])
    .lte('center_lng', bbox[2])
    .gte('center_lat', bbox[1])
    .lte('center_lat', bbox[3])
    .gt('crowd_count', 0)
    .limit(200);

  if (error) return bad(error.message, 500);

  const now = Date.now();
  const tiles = (data ?? []).map((t: any) => {
    const lastUpdate = new Date(t.updated_at).getTime();
    const staleness = Math.min(1, (now - lastUpdate) / (5 * 60 * 1000)); // 5min decay
    
    // Convert crowd and vibe data to energy metrics
    const baseEnergy = Math.min(1, t.crowd_count / 10); // normalize crowd
    const energy = baseEnergy * (1 - staleness * 0.5); // decay with staleness
    
    // Calculate slope based on vibe mix variance (proxy for activity)
    const vibeEntropy = calculateVibeEntropy(t.vibe_mix || {});
    const slope = (vibeEntropy - 0.5) * 0.4; // center around 0, scale to ±0.2
    
    // Volatility from crowd density and vibe diversity
    const volatility = Math.min(1, vibeEntropy + (t.crowd_count > 5 ? 0.3 : 0));

    return {
      h3: t.tile_id,
      energy: Math.max(0, Math.min(1, energy)),
      slope: Math.max(-1, Math.min(1, slope)),
      volatility: Math.max(0, Math.min(1, volatility)),
    };
  });

  return ok({ tiles, meta: { zoom, res } });
});

// Calculate entropy of vibe distribution as proxy for activity/volatility
function calculateVibeEntropy(vibeMix: Record<string, number>): number {
  const values = Object.values(vibeMix);
  if (values.length === 0) return 0;
  
  const total = values.reduce((sum, val) => sum + val, 0);
  if (total === 0) return 0;
  
  const probs = values.map(val => val / total);
  return -probs.reduce((entropy, p) => {
    return p > 0 ? entropy + p * Math.log2(p) : entropy;
  }, 0) / Math.log2(values.length); // normalize to 0-1
}