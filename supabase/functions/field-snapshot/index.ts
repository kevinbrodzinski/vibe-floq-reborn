// Aggregates presence tiles & emits light "field" snapshot for the map.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type RequestBody = { 
  bbox?: [number,number,number,number]; 
  zoom?: number; 
  res?: number 
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ok = (body: unknown) => new Response(JSON.stringify(body), { 
  headers: { 
    ...corsHeaders, 
    'content-type': 'application/json', 
    'cache-control': 'public, s-maxage=15, max-age=15' 
  }
});

const bad = (message: string, code = 400) => new Response(JSON.stringify({ error: message }), { 
  status: code, 
  headers: corsHeaders 
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') return bad('POST required', 405);

  try {
    const { bbox, zoom = 14, res = 9 } = await req.json() as RequestBody;
    if (!bbox || bbox.length !== 4) return bad('bbox [lng1,lat1,lng2,lat2] required');

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    // Get field tiles using existing presence infrastructure
    const { data, error } = await supabase
      .from('field_tiles_v2')
      .select('tile_id, center_lat, center_lng, crowd_count, avg_vibe, vibe_mix, updated_at')
      .gte('center_lng', bbox[0])
      .lte('center_lng', bbox[2])
      .gte('center_lat', bbox[1])
      .lte('center_lat', bbox[3])
      .gt('crowd_count', 0)
      .limit(200);

    if (error) {
      console.error('Field snapshot error:', error);
      return bad(error.message, 500);
    }

    // Shape into energy/slope/volatility format (range-only; no PII)
    const now = Date.now();
    const shaped = (data ?? []).map((tile: any) => {
      const lastUpdate = new Date(tile.updated_at).getTime();
      const staleness = Math.min(1, (now - lastUpdate) / (5 * 60 * 1000)); // 5min decay
      
      // Convert crowd and vibe data to energy metrics
      const baseEnergy = Math.min(1, tile.crowd_count / 10); // normalize crowd
      const energy = baseEnergy * (1 - staleness * 0.5); // decay with staleness
      
      // Calculate slope based on vibe mix variance (proxy for activity)
      const vibeEntropy = calculateVibeEntropy(tile.vibe_mix || {});
      const slope = (vibeEntropy - 0.5) * 0.4; // center around 0, scale to ±0.2
      
      // Volatility from crowd density and vibe diversity
      const volatility = Math.min(1, vibeEntropy + (tile.crowd_count > 5 ? 0.3 : 0));

      return {
        h3: tile.tile_id,
        lat: tile.center_lat,
        lng: tile.center_lng,
        energy: Math.max(0, Math.min(1, energy)),
        slope: Math.max(-1, Math.min(1, slope)),
        volatility: Math.max(0, Math.min(1, volatility)),
        crowd: Math.min(10, tile.crowd_count) // cap for privacy
      };
    });

    return ok({ 
      tiles: shaped, 
      meta: { 
        zoom, 
        res, 
        count: shaped.length,
        timestamp: new Date().toISOString()
      } 
    });

  } catch (error) {
    console.error('Field snapshot processing error:', error);
    return bad('Internal server error', 500);
  }
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