/// <reference lib="deno.unstable" />

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';
import { mapToVenue, upsertVenues } from '../_shared/venues.ts';

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
      return new Response(
        JSON.stringify({ 
          skipped: 'recently synced', 
          lastSync: recent.ts,
          cooldownMinutes: 15
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check API key availability with debug info
    console.log('[DEBUG] GP key len:', (Deno.env.get('GOOGLE_PLACES_KEY')||'').length);
    if (!PLACES_KEY) {
      console.error('[Sync Places] GOOGLE_PLACES_KEY missing from environment');
      return new Response(
        JSON.stringify({ 
          error: 'Google Places API key not configured. Please configure GOOGLE_PLACES_KEY in edge function secrets.',
          details: 'Please configure GOOGLE_PLACES_KEY in edge function secrets'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    /* ---- Try New Google Places API First, fallback to legacy --------- */
    const results: any[] = [];
    let useNewAPI = true;
    let apiAttempts = 0;
    const maxRetries = 2;

    while (apiAttempts < maxRetries) {
      apiAttempts++;
      
      try {
        if (useNewAPI) {
          console.log(`[Sync Places] Attempting new Places API (attempt ${apiAttempts})`);
          
          // Try new Places API with better error handling
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

          const newApiText = await newApiResp.text();
          
          if (newApiResp.ok) {
            const newApiData = JSON.parse(newApiText);
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
            break; // Success, exit retry loop
          } else {
            console.error(`[Sync Places] New API failed: ${newApiResp.status}`, newApiText);
            if (newApiResp.status === 403 || newApiResp.status === 401) {
              useNewAPI = false; // Switch to legacy API
              console.log(`[Sync Places] Switching to legacy API due to auth failure`);
            } else {
              throw new Error(`New API HTTP error: ${newApiResp.status}`);
            }
          }
        }

        if (!useNewAPI) {
          console.log(`[Sync Places] Using legacy Places API (attempt ${apiAttempts})`);
          
          // Legacy API with enhanced error handling
          const legacyUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
          legacyUrl.searchParams.set('location', `${lat},${lng}`);
          legacyUrl.searchParams.set('radius', String(RADIUS_M));
          legacyUrl.searchParams.set('key', PLACES_KEY);
          if (keyword) legacyUrl.searchParams.set('keyword', encodeURIComponent(keyword));

          console.log(`[Sync Places] Legacy API call: ${legacyUrl.toString().replace(PLACES_KEY, '[REDACTED]')}`);

          const legacyResp = await fetch(legacyUrl);
          const legacyText = await legacyResp.text();
          
          if (!legacyResp.ok) {
            console.error(`[Sync Places] Legacy API HTTP error: ${legacyResp.status}`, legacyText);
            if (legacyResp.status === 403 || legacyResp.status === 401) {
              return new Response(
                JSON.stringify({ 
                  error: 'Google Places API access denied. Please check your API key permissions.',
                  details: legacyText,
                  help: 'Ensure both "Places API" and "Places API (New)" are enabled in Google Cloud Console'
                }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            throw new Error(`Legacy API HTTP error: ${legacyResp.status}`);
          }

          const legacyData = JSON.parse(legacyText);
          
          if (legacyData.status === 'REQUEST_DENIED') {
            console.error(`[Sync Places] Legacy API request denied:`, legacyData);
            return new Response(
              JSON.stringify({ 
                error: 'Google Places API access denied',
                details: legacyData.error_message,
                help: 'Enable "Places API (Legacy)" in Google Cloud Console and check API key restrictions'
              }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          if (legacyData.status === 'OK' || legacyData.status === 'ZERO_RESULTS') {
            console.log(`[Sync Places] Legacy API success: ${legacyData.results?.length || 0} places found`);
            if (legacyData.results) {
              results.push(...legacyData.results);
            }
            break; // Success, exit retry loop
          } else {
            console.error(`[Sync Places] Legacy API error: ${legacyData.status} - ${legacyData.error_message}`);
            throw new Error(`Legacy API error: ${legacyData.status}`);
          }
        }
      } catch (error) {
        console.error(`[Sync Places] API attempt ${apiAttempts} failed:`, error);
        
        if (apiAttempts >= maxRetries) {
          return new Response(
            JSON.stringify({ 
              error: 'All Google Places API attempts failed',
              details: error instanceof Error ? error.message : String(error),
              tried_new_api: useNewAPI,
              tried_legacy_api: !useNewAPI || apiAttempts > 1
            }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Try alternative API on next attempt
        if (useNewAPI) {
          useNewAPI = false;
          console.log(`[Sync Places] Retrying with legacy API after new API failure`);
        }
      }
    }

    console.log(`[Sync Places] Total places found across all pages: ${results.length}`);

    if (results.length === 0) {
      console.log(`[Sync Places] No places found for location ${lat},${lng}`);
      // Still log the sync attempt to prevent repeated calls
      await supabase.from('sync_log').insert({ kind: 'places', lat, lng });
      return new Response(
        JSON.stringify({ 
          ok: true, 
          count: 0, 
          message: 'No places found in this area',
          location: { lat, lng }
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
        return null;
      }
    }).filter(Boolean);

    console.log(`[Sync Places] Successfully mapped ${rows.length} venues for database insertion`);

    if (rows.length === 0) {
      console.warn('[Sync Places] No venues could be mapped successfully');
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'Failed to map any venues',
          details: 'All venue mapping attempts failed'
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use shared upsert function with retry logic
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await upsertVenues(rows);
        break; // Success, exit retry loop
      } catch (error) {
        console.error(`[Sync Places] Database upsert error (attempt ${attempt}):`, error);
        
        if (attempt === 3) {
          // Final attempt failed
          return new Response(
            JSON.stringify({ 
              ok: false, 
              error: 'Database insertion failed after 3 attempts',
              details: error instanceof Error ? error.message : String(error)
            }), 
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Wait with exponential backoff: 1s, 2s, 4s
        await sleep(1000 * Math.pow(2, attempt));
      }
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
        ok: true, 
        count: rows.length,
        source: "google_places",
        location: { lat, lng },
        keyword: keyword || null
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[Sync Places] Unexpected error:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: 'Internal server error',
        details: errorMessage,
        source: 'sync-places'
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});