/// <reference lib="deno.unstable" />

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders, respondWithCors } from '../_shared/cors.ts';
import { mapToVenue, upsertVenues, logVenueDrop } from '../_shared/venues.ts';
import { withRetry } from '../_shared/retry.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const PLACES_KEY = Deno.env.get('GOOGLE_PLACES_KEY');
const RADIUS_M   = 1_200;


serve(async (req) => {
  // Handle CORS preflight requests FIRST
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: { 
        ...corsHeaders, 
        "Content-Length": "0" 
      } 
    });
  }
  
  if (req.method !== 'POST') {
    return new Response('POST only', { status: 405, headers: corsHeaders });
  }

  try {
    console.log(`[Sync Places] Starting sync request`);
    
    const payload = await req.json();
    const lat = Number(payload.lat);
    const lng = Number(payload.lng);
    const keyword = payload.keyword ?? "";
    
    // No auth required for public function
    const profile_id = payload.profile_id;
    
    console.log(`[Sync Places] Starting request for location: ${lat},${lng} by=${profile_id ?? "anon"}`);
    
    // Validate required coordinates
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.error(`[Sync Places] Missing or invalid coordinates: lat=${lat}, lng=${lng}`);
      return new Response(
        JSON.stringify({ 
          error: 'lat & lng are required numbers',
          details: { lat: Number.isFinite(lat), lng: Number.isFinite(lng) }
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      return respondWithCors({ 
        ok: true,
        count: 0,
        skipped: 'recently synced', 
        lastSync: recent.ts,
        cooldownMinutes: 15,
        phase: 'deduplication'
      });
    }

    // Check API key availability with debug info
    console.log('[DEBUG] GP key len:', (Deno.env.get('GOOGLE_PLACES_KEY')||'').length);
    if (!PLACES_KEY) {
      console.error('[Sync Places] GOOGLE_PLACES_KEY missing from environment');
      await logVenueDrop('missing_api_key', { service: 'google_places' });
      return respondWithCors({ 
        ok: false,
        count: 0,
        error: 'Google Places API key not configured. Please configure GOOGLE_PLACES_KEY in edge function secrets.',
        phase: 'initialization'
      }, 500);
    }

    /* ---- Try API calls with retry logic ----------------------------- */
    const results: any[] = [];
    let apiPhase = 'unknown';
    
    try {
      // Wrap API calls in retry logic
      await withRetry(async () => {
        // Try new Google Places API first
        apiPhase = 'new_places_api';
        try {
          console.log(`[Sync Places] Attempting new Places API`);
          
          const newApiResp = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': PLACES_KEY,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.types,places.photos'
            },
            body: JSON.stringify({
              includedTypes: keyword ? [] : ['restaurant', 'bar', 'cafe', 'tourist_attraction'],
              maxResultCount: 20,
              locationRestriction: {
                circle: {
                  center: { latitude: lat, longitude: lng },
                  radius: RADIUS_M
                }
              }
            })
          });

          if (!newApiResp.ok) {
            console.log(`[Sync Places] New API failed: ${newApiResp.status}, trying legacy API`);
            throw new Error(`New API failed: ${newApiResp.status}`);
          }

          const newApiData = await newApiResp.json();
          console.log(`[Sync Places] New API success: ${newApiData.places?.length || 0} places found`);
          
          // Transform new API response to legacy format
          if (newApiData.places) {
            for (const place of newApiData.places) {
              results.push({
                place_id: place.id,
                name: place.displayName?.text || 'Unknown Place',
                types: place.types || [],
                rating: place.rating,
                geometry: {
                  location: {
                    lat: place.location?.latitude || lat,
                    lng: place.location?.longitude || lng
                  }
                },
                photos: place.photos ? [{
                  photo_reference: place.photos[0]?.name?.split('/')[3] // Extract photo reference
                }] : []
              });
            }
          }
          return; // Success, don't try legacy
        } catch (newApiError) {
          console.log(`[Sync Places] New API failed, falling back to legacy:`, newApiError);
          
          // Fallback to legacy API
          apiPhase = 'legacy_places_api';
          const legacyUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
          legacyUrl.searchParams.set('location', `${lat},${lng}`);
          legacyUrl.searchParams.set('radius', String(RADIUS_M));
          legacyUrl.searchParams.set('key', PLACES_KEY);
          if (keyword) legacyUrl.searchParams.set('keyword', encodeURIComponent(keyword));

          console.log(`[Sync Places] Legacy API call: ${legacyUrl.toString().replace(PLACES_KEY, '[REDACTED]')}`);

          const legacyResp = await fetch(legacyUrl);
          
          if (!legacyResp.ok) {
            await logVenueDrop('api_error', { 
              api: 'google_legacy', 
              status: legacyResp.status, 
              lat, lng 
            });
            
            if (legacyResp.status === 403 || legacyResp.status === 401) {
              throw new Error('Google Places API access denied. Please check your API key permissions.');
            }
            throw new Error(`Legacy API HTTP error: ${legacyResp.status}`);
          }

          const legacyData = await legacyResp.json();
          
          if (legacyData.status === 'REQUEST_DENIED') {
            await logVenueDrop('api_denied', { 
              api: 'google_legacy', 
              error: legacyData.error_message, 
              lat, lng 
            });
            throw new Error(`Google Places API access denied: ${legacyData.error_message}`);
          }
          
          if (legacyData.status === 'OK' || legacyData.status === 'ZERO_RESULTS') {
            console.log(`[Sync Places] Legacy API success: ${legacyData.results?.length || 0} places found`);
            if (legacyData.results) {
              results.push(...legacyData.results);
            }
          } else {
            await logVenueDrop('api_error', { 
              api: 'google_legacy', 
              status: legacyData.status, 
              error: legacyData.error_message, 
              lat, lng 
            });
            throw new Error(`Legacy API error: ${legacyData.status}`);
          }
        }
      }, { attempts: 2, backoffMs: 1000 });
    } catch (apiError) {
      console.error('[Sync Places] All API attempts failed:', apiError);
      await logVenueDrop('all_apis_failed', { error: apiError, lat, lng, phase: apiPhase });
      
      return respondWithCors({ 
        ok: false,
        count: 0,
        error: 'All Google Places API attempts failed',
        details: apiError instanceof Error ? apiError.message : String(apiError),
        phase: apiPhase
      }, 502);
    }

    console.log(`[Sync Places] Total places found: ${results.length}`);

    if (results.length === 0) {
      console.log(`[Sync Places] No places found for location ${lat},${lng}`);
      // Still log the sync attempt to prevent repeated calls
      await supabase.from('sync_log').insert({ kind: 'places', lat, lng });
      return respondWithCors({ 
        ok: true, 
        count: 0, 
        message: 'No places found in this area',
        location: { lat, lng },
        phase: 'data_processing'
      });
    }

    // Map venues using shared infrastructure with fallback coordinates
    const rows = results.map((p) => {
      try {
        // Ensure coordinates exist with fallbacks
        if (!p.geometry?.location?.lat || !p.geometry?.location?.lng) {
          p.geometry = { location: { lat, lng } };
        }
        return mapToVenue({ provider: "google", r: p });
      } catch (mapError) {
        console.error(`[Sync Places] Failed to map place:`, p, mapError);
        logVenueDrop('mapping_error', { place: p, error: mapError }, 'google');
        return null;
      }
    }).filter(Boolean);

    console.log(`[Sync Places] Successfully mapped ${rows.length} venues for database insertion`);

    if (rows.length === 0) {
      console.warn('[Sync Places] No venues could be mapped successfully');
      await logVenueDrop('no_mappable_venues', { originalCount: results.length });
      return respondWithCors({ 
        ok: false, 
        count: 0,
        error: 'Failed to map any venues',
        details: 'All venue mapping attempts failed',
        phase: 'data_mapping'
      }, 500);
    }

    // Use shared upsert function with enhanced error handling
    let upsertResult;
    try {
      upsertResult = await withRetry(async () => {
        return await upsertVenues(rows);
      }, { attempts: 3, backoffMs: 1000 });
    } catch (error) {
      console.error(`[Sync Places] Database upsert error after retries:`, error);
      await logVenueDrop('database_upsert_failed', { 
        error: error instanceof Error ? error.message : String(error),
        venueCount: rows.length 
      });
      
      return respondWithCors({ 
        ok: false, 
        count: 0,
        error: 'Database insertion failed after retries',
        details: error instanceof Error ? error.message : String(error),
        phase: 'database_upsert'
      }, 500);
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
    
    console.log(`[Sync Places] OK • ${upsertResult.inserted} places • radius=${RADIUS_M}m • by=${profile_id ?? "anon"}`);

    return respondWithCors({ 
      ok: true, 
      count: upsertResult.inserted,
      source: "google_places",
      location: { lat, lng },
      keyword: keyword || null,
      phase: 'completed',
      errors: upsertResult.errors.length > 0 ? upsertResult.errors : undefined
    });
  } catch (err) {
    console.error('[Sync Places] Unexpected error:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    // Log the unexpected error
    await logVenueDrop('unexpected_error', { error: errorMessage });
    
    return respondWithCors({ 
      ok: false,
      count: 0,
      error: 'Internal server error',
      details: errorMessage,
      source: 'sync-places',
      phase: 'unknown'
    }, 500);
  }
});