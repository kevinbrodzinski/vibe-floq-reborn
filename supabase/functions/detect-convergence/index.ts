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

    // fallback bbox if only center is provided
    let qbbox = bbox;
    if (!qbbox && center) {
      const deg = 0.01 - Math.max(0, (zoom - 12)) * 0.0006;
      qbbox = [center[0]-deg, center[1]-deg, center[0]+deg, center[1]+deg];
    }
    if (!qbbox) {
      return new Response(
        JSON.stringify({ points: [] }), 
        { headers: { ...corsHeaders, 'content-type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { 
        auth: { persistSession: false },
        global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
      }
    );

    const sinceIso = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    
    // Use the SQL RPC for precise centroids
    const { data, error } = await supabase.rpc('recent_convergence', {
      west:  qbbox[0],
      south: qbbox[1],
      east:  qbbox[2],
      north: qbbox[3],
      since: sinceIso
    });

    if (error) throw error;

    // Map -> ConvergencePoint with simple prob/eta heuristics (tune later)
    const points: ConvergencePoint[] = (data ?? []).map((r: any) => {
      const n = Number(r.n) || 0;
      const prob = Math.max(0.25, Math.min(0.95, 0.25 + 0.12 * n));
      const eta  = Math.max(3, 15 - Math.min(10, Math.round(n / 2)));
      return { lng: Number(r.lng), lat: Number(r.lat), prob, etaMin: eta, groupMin: n };
    });

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
      JSON.stringify({ error: e?.message ?? 'error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'content-type': 'application/json' } 
      }
    );
  }
});