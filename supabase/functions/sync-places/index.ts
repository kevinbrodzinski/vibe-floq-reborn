/// <reference lib="deno.unstable" />

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { getUserId } from '../_shared/getUserId.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const PLACES_KEY = Deno.env.get('GOOGLE_PLACES_KEY');
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
    console.log(`[Sync Places] Starting sync request`);
    
    const payload = await req.json();
    const lat = Number(payload.lat);
    const lng = Number(payload.lng);
    const keyword = payload.keyword ?? "";
    
    // Extract user ID from JWT for optional context (no behavioral change)
    const profile_id = payload.profile_id ?? (await getUserId(req));
    
    console.log(`[Sync Places] Starting request for location: ${lat},${lng} by=${profile_id ?? "anon"}`);
    
    // Validate required coordinates
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.error(`[Sync Places] Missing or invalid coordinates: lat=${lat}, lng=${lng}`);
      return new Response(
        JSON.stringify({ 
          error: 'lat & lng are required numbers',
          details: { lat: Number.isFinite(lat), lng: Number.isFinite(lng) }
        }), 
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate coordinates range
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.error(`[Sync Places] Invalid coordinates range: lat=${lat}, lng=${lng}`);
      return new Response(
        JSON.stringify({ 
          error: "Invalid coordinates range",
          details: "Latitude must be between -90 and 90, longitude between -180 and 180"
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`[Sync Places] Fetching places near ${lat},${lng} with radius ${RADIUS_M}m, keyword: ${keyword || 'none'}`);

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
      console.log('[Sync Places] Recently synced, skipping API call');
      return new Response(
        JSON.stringify({ 
          skipped: 'recently synced', 
          lastSync: recent.ts,
          cooldownMinutes: 15
        }), 
        { headers: corsHeaders }
      );
    }

    // Check API key availability
    if (!PLACES_KEY) {
      console.error('[Sync Places] GOOGLE_PLACES_KEY missing from environment');
      return new Response(
        JSON.stringify({ 
          error: 'Google Places API key not configured. Please configure GOOGLE_PLACES_KEY in edge function secrets.',
          details: 'Please configure GOOGLE_PLACES_KEY in edge function secrets'
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    /* ---- Google pagination loop --------------------------------------- */
    const results: any[] = [];
    let pageToken: string | undefined;
    let pageCount = 0;
    const maxPages = 3; // Prevent infinite loops

    do {
      pageCount++;
      if (pageCount > maxPages) {
        console.warn(`[Sync Places] Reached maximum page limit (${maxPages}), stopping pagination`);
        break;
      }

      const u = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
      u.searchParams.set('location', `${lat},${lng}`);
      u.searchParams.set('radius',   String(RADIUS_M));
      u.searchParams.set('key',      PLACES_KEY);
      if (keyword)  u.searchParams.set('keyword', encodeURIComponent(keyword));
      if (pageToken) u.searchParams.set('pagetoken', pageToken);

      console.log(`[Sync Places] Requesting page ${pageCount}: ${u.toString().replace(PLACES_KEY, '[REDACTED]')}`);

      const resp = await fetch(u);
      const responseText = await resp.text();
      
      if (!resp.ok) {
        console.error(`[Sync Places] HTTP error: ${resp.status} ${resp.statusText}`, {
          status: resp.status,
          statusText: resp.statusText,
          body: responseText
        });
        return new Response(
          JSON.stringify({ 
            error: `Google Places API HTTP error: ${resp.status}`,
            details: responseText,
            help: 'Check your API key permissions and ensure Places API is enabled'
          }),
          { status: 502, headers: corsHeaders }
        );
      }

      let json;
      try {
        json = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[Sync Places] Failed to parse API response:`, parseError, responseText);
        return new Response(
          JSON.stringify({ 
            error: 'Invalid API response format',
            details: 'Could not parse Google Places API response'
          }),
          { status: 502, headers: corsHeaders }
        );
      }
      
      if (json.status === 'REQUEST_DENIED') {
        console.error(`[Sync Places] Request denied: ${json.error_message}`, {
          status: json.status,
          error_message: json.error_message,
          full_response: json
        });
        return new Response(
          JSON.stringify({ 
            error: 'Google Places API access denied. Please check your API key permissions.',
            details: json.error_message,
            help: 'Ensure Places API (Legacy) is enabled in Google Cloud Console and your API key has proper restrictions configured.',
            google_response: json
          }),
          { status: 403, headers: corsHeaders }
        );
      }
      
      if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
        console.error(`[Sync Places] API error: ${json.status} - ${json.error_message}`);
        throw new Error(`Google Places API error: ${json.status} - ${json.error_message}`);
      }

      console.log(`[Sync Places] Page ${pageCount}: status=${json.status}, found ${json.results?.length || 0} places`);
      
      if (json.results && json.results.length > 0) {
        results.push(...json.results);
      }
      
      pageToken = json.next_page_token;
      if (pageToken) {
        console.log('[Sync Places] Next page token received, waiting for token activation...');
        await new Promise(r => setTimeout(r, 2_000)); // token warm-up
      }
    } while (pageToken);

    console.log(`[Sync Places] Total places found across all pages: ${results.length}`);

    if (results.length === 0) {
      console.log(`[Sync Places] No places found for location ${lat},${lng}`);
      // Still log the sync attempt to prevent repeated calls
      await supabase.from('sync_log').insert({ kind: 'places', lat, lng });
      return new Response(
        JSON.stringify({ 
          success: true, 
          upserted: 0, 
          message: 'No places found in this area',
          location: { lat, lng }
        }), 
        { headers: corsHeaders }
      );
    }

    const rows = results.map((p) => {
      try {
        return {
          provider: 'google',
          provider_id: p.place_id,
          name: p.name || 'Unknown Place',
          address: p.vicinity || null,
          categories: Array.isArray(p.types) ? p.types : [],
          rating: p.rating ?? null,
          lat: p.geometry?.location?.lat || 0,
          lng: p.geometry?.location?.lng || 0,
          photo_url: p.photos?.[0]?.photo_reference
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${p.photos[0].photo_reference}&key=${PLACES_KEY}`
            : null,
          source: 'api',
          radius_m: 100,
          popularity: 0,
          vibe_score: 50.0,
          live_count: 0,
          price_tier: p.price_level ? '$'.repeat(p.price_level) : '$',
        };
      } catch (mapError) {
        console.error(`[Sync Places] Failed to map place:`, p, mapError);
        return null;
      }
    }).filter(Boolean);

    console.log(`[Sync Places] Successfully mapped ${rows.length} venues for database insertion`);

    if (rows.length === 0) {
      console.warn('[Sync Places] No venues could be mapped successfully');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to map any venues',
          details: 'All venue mapping attempts failed'
        }), 
        { status: 500, headers: corsHeaders }
      );
    }

    const { error } = await supabase
      .from('venues')
      .upsert(rows, {
        onConflict: 'provider,provider_id',
        updateColumns: ['name','address','categories','rating','photo_url','updated_at'],
      });

    if (error) {
      console.error('[Sync Places] Database upsert error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database insertion failed',
          details: error.message
        }), 
        { status: 500, headers: corsHeaders }
      );
    }

    // log success
    const { error: logError } = await supabase.from('sync_log').insert({ 
      kind: 'places', 
      lat, 
      lng 
    });
    
    if (logError) {
      console.warn('[Sync Places] Failed to log sync attempt:', logError);
      // Don't fail the request for logging issues
    }
    
    console.log(`[Sync Places] OK • ${rows.length} places • radius=${RADIUS_M}m • by=${profile_id ?? "anon"}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        upserted: rows.length,
        source: "google_places",
        location: { lat, lng },
        keyword: keyword || null
      }), 
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('[Sync Places] Unexpected error:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        details: errorMessage,
        source: 'sync-places'
      }), 
      { status: 500, headers: corsHeaders }
    );
  }
});