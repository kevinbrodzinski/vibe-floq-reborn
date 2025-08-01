/// <reference lib="deno.unstable" />

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const PLACES_KEY = Deno.env.get('GOOGLE_PLACES_KEY')!;
const RADIUS_M   = 1_200;

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type':                'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST')    return new Response('POST only', { status: 405, headers: corsHeaders });

  try {
    const { lat, lng, keyword } = await req.json();
    if (lat === undefined || lng === undefined) {
      return new Response(JSON.stringify({ error: 'lat and lng required' }), { status: 400, headers: corsHeaders });
    }

    console.log(`Fetching places near ${lat},${lng} with radius ${RADIUS_M}m`);

    /* ---- dedupe guard -------------------------------------------------- */
    const { data: recent } = await supabase
      .from('sync_log')
      .select('ts')
      .eq('kind', 'places')
      .eq('lat', lat)
      .eq('lng', lng)
      .gte('ts', new Date(Date.now() - 15 * 60_000).toISOString())
      .maybeSingle();

    if (recent) {
      console.log('Recently synced, skipping API call');
      return new Response(JSON.stringify({ skipped: 'recently synced' }), { headers: corsHeaders });
    }

    /* ---- Google pagination loop --------------------------------------- */
    const results: any[] = [];
    let pageToken: string | undefined;

    do {
      const u = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
      u.searchParams.set('location', `${lat},${lng}`);
      u.searchParams.set('radius',   String(RADIUS_M));
      u.searchParams.set('key',      PLACES_KEY);
      if (keyword)  u.searchParams.set('keyword', encodeURIComponent(keyword));
      if (pageToken) u.searchParams.set('pagetoken', pageToken);

      const resp = await fetch(u);
      const json = await resp.json();
      if (!resp.ok) {
        console.error('Google Places API error:', json);
        throw new Error(json.error_message || 'Places API error');
      }

      console.log(`Page ${pageToken ? 'continuation' : 'initial'}: found ${json.results?.length || 0} places`);
      results.push(...(json.results || []));
      pageToken = json.next_page_token;
      if (pageToken) {
        console.log('Waiting for next page token...');
        await new Promise(r => setTimeout(r, 2_000)); // token warm-up
      }
    } while (pageToken);

    console.log(`Total places found: ${results.length}`);

    const rows = results.map((p) => ({
      provider: 'google',
      provider_id: p.place_id,
      name: p.name,
      address: p.vicinity,
      categories: p.types,
      rating: p.rating ?? null,
      lat: p.geometry.location.lat,
      lng: p.geometry.location.lng,
      photo_url: p.photos?.[0]?.photo_reference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${p.photos[0].photo_reference}&key=${PLACES_KEY}`
        : null,
      source: 'api',
      radius_m: 100,
      popularity: 0,
      vibe_score: 50.0,
      live_count: 0,
      price_tier: '$',
    }));

    const { error } = await supabase
      .from('venues')
      .upsert(rows, {
        onConflict: 'provider,provider_id',
        updateColumns: ['name','address','categories','rating','photo_url','updated_at'],
      });

    if (error) {
      console.error('Database upsert error:', error);
      throw error;
    }

    // log success
    await supabase.from('sync_log').insert({ kind: 'places', lat, lng });
    
    console.log(`Successfully upserted ${rows.length} venues`);

    return new Response(JSON.stringify({ success: true, upserted: rows.length }), { headers: corsHeaders });
  } catch (err) {
    console.error('sync-places error', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});