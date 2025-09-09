import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';

type Req = {
  bbox?: [number, number, number, number] // [minLng,minLat,maxLng,maxLat]
  center?: [number, number]               // [lng,lat]
  radius?: number                         // meters
  filters?: {
    vibeRange?: [number, number]
    timeWindow?: { start: string; end: string } // ISO
    friendFlows?: boolean
    queue?: 'any'|'short'|'none'
    weatherPref?: string[]
  }
}

type TileVenue = {
  pid: string
  name: string
  category?: string | null
  open_now?: boolean | null
  busy_band?: 0|1|2|3|4
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
    const { bbox, center, radius = 900, filters }: Req = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { 
        auth: { persistSession: false },
        global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
      }
    );

    // Compute bbox from center+radius if not provided
    let qbbox = bbox;
    if (!qbbox && center) {
      const deg = radius / 111_000; // rough conversion
      qbbox = [center[0] - deg, center[1] - deg, center[0] + deg, center[1] + deg];
    }
    if (!qbbox) {
      return new Response(
        JSON.stringify({ venues: [] }), 
        { headers: { ...corsHeaders, 'content-type': 'application/json', 'cache-control': 'public, max-age=60' } }
      );
    }

    // Use RPC for geometry-safe venue search
    const q = undefined; // TODO: derive from filters later
    const { data: venuesRaw, error: vErr } = await supabase.rpc('search_venues_bbox', {
      west: qbbox[0], south: qbbox[1], east: qbbox[2], north: qbbox[3],
      q, lim: 200
    });

    if (vErr) throw vErr;

    // Get active flow segments in last 45 minutes for busy_band calculation
    const sinceIso = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    const { data: segAgg, error: sErr } = await supabase
      .rpc('get_venue_flow_counts', { since_timestamp: sinceIso });

    if (sErr) {
      console.warn('[search-flow-venues] Could not get flow counts:', sErr);
    }

    const counts = new Map<string, number>();
    (segAgg ?? []).forEach((r: any) => counts.set(r.venue_id, Number(r.count) || 0));

    // Map to TileVenue format
    const venues: TileVenue[] = (venuesRaw ?? []).map((v: any) => {
      const c = counts.get(v.id) ?? 0;
      const band = c === 0 ? 0 : c === 1 ? 1 : c <= 3 ? 2 : c <= 6 ? 3 : 4;
      
      return {
        pid: v.id,
        name: v.name,
        category: v.category,
        open_now: v.open_now ?? null,
        busy_band: band,
      };
    });

    // Apply basic filters (more sophisticated filtering can be added later)
    let filteredVenues = venues;
    if (filters?.friendFlows) {
      // TODO: Filter to venues where friends have recent flows
    }

    return new Response(
      JSON.stringify({ venues: filteredVenues, ttlSec: 60 }), 
      { 
        headers: { 
          ...corsHeaders, 
          'content-type': 'application/json', 
          'cache-control': 'public, max-age=60' 
        } 
      }
    );

  } catch (e: any) {
    console.error('[search-flow-venues]', e);
    return new Response(
      JSON.stringify({ error: e?.message ?? 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'content-type': 'application/json' } 
      }
    );
  }
});