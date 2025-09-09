import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';

type Req = {
  bbox?: [number, number, number, number] // optional coarse bounding
  center?: [number, number]
  zoom?: number
}

type ConvergencePoint = {
  lng: number
  lat: number
  prob: number     // 0..1
  etaMin: number
  groupMin: number
}

serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'POST required' }), 
      { status: 405, headers: { ...corsHeaders, 'content-type': 'application/json' } }
    );
  }

  try {
    const { bbox, center, zoom = 14 }: Req = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { 
        auth: { persistSession: false },
        global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
      }
    );

    const sinceIso = new Date(Date.now() - 45 * 60 * 1000).toISOString();

    // Fetch recent flow segments
    const { data: segs, error } = await supabase
      .from('flow_segments')
      .select('flow_id, h3_idx, center, arrived_at')
      .gte('arrived_at', sinceIso)
      .limit(2000);

    if (error) throw error;

    // Cluster by h3_idx or fallback to rounded coordinates
    const bins = new Map<string, { lng: number; lat: number; n: number }>();
    
    for (const s of segs ?? []) {
      let key = s.h3_idx as string | null;
      let lng = 0, lat = 0;

      if (key) {
        // Use h3_idx for clustering - generate pseudo coordinates for demo
        const h = hash(key);
        const dx = ((h & 0xffff) / 0xffff) - 0.5;
        const dy = (((h >>> 16) & 0xffff) / 0xffff) - 0.5;
        const baseLng = (center?.[0] ?? -118.4695);
        const baseLat = (center?.[1] ?? 33.9855);
        const deg = Math.max(0.002, 0.01 - 0.0006 * (zoom - 12));
        lng = baseLng + dx * deg;
        lat = baseLat + dy * deg;
      } else if (s.center) {
        // For geometry points, we'd need a proper conversion
        // For now, skip non-h3 entries or add ST_X/ST_Y to the select
        continue;
      } else {
        continue;
      }

      const b = bins.get(key!) ?? { lng, lat, n: 0 };
      b.n += 1;
      bins.set(key!, b);
    }

    // Generate convergence points from clusters with sufficient activity
    const points: ConvergencePoint[] = Array.from(bins.values())
      .filter(b => b.n >= 3)   // minimum group threshold
      .slice(0, 12)            // limit results
      .map(b => ({
        lng: b.lng, 
        lat: b.lat,
        groupMin: b.n,
        prob: Math.max(0.25, Math.min(0.95, 0.25 + 0.12 * b.n)), // probability heuristic
        etaMin: Math.max(3, 15 - Math.min(10, Math.round(b.n / 2))), // ETA heuristic
      }));

    return new Response(
      JSON.stringify({ points, ttlSec: 30 }), 
      { 
        headers: { 
          ...corsHeaders, 
          'content-type': 'application/json', 
          'cache-control': 'public, max-age=30' 
        } 
      }
    );

  } catch (e: any) {
    console.error('[detect-convergence]', e);
    return new Response(
      JSON.stringify({ error: e?.message ?? 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'content-type': 'application/json' } 
      }
    );
  }
});

function hash(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}