// API Key Validation Test Function
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: corsHeaders });

  try {
    console.log('[API Validator] Starting API key validation tests');
    
    const { lat = 34.0522, lng = -118.2437 } = await req.json(); // Default to LA
    const results: any = {
      timestamp: new Date().toISOString(),
      location: { lat, lng },
      tests: {}
    };

    // Test Google Places API Key
    const googleKey = Deno.env.get('GOOGLE_PLACES_KEY');
    if (googleKey) {
      console.log('[API Validator] Testing Google Places API...');
      
      // Test legacy API
      try {
        const legacyUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
        legacyUrl.searchParams.set('location', `${lat},${lng}`);
        legacyUrl.searchParams.set('radius', '100');
        legacyUrl.searchParams.set('key', googleKey);
        
        const legacyResp = await fetch(legacyUrl);
        const legacyData = await legacyResp.text();
        
        results.tests.google_legacy = {
          status: legacyResp.status,
          success: legacyResp.ok,
          response: legacyData.substring(0, 200) + '...'
        };
      } catch (error) {
        results.tests.google_legacy = {
          status: 'error',
          success: false,
          error: error.message
        };
      }
      
      // Test new API
      try {
        const newResp = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googleKey,
            'X-Goog-FieldMask': 'places.id,places.displayName'
          },
          body: JSON.stringify({
            includedTypes: ['restaurant'],
            maxResultCount: 1,
            locationRestriction: {
              circle: {
                center: { latitude: lat, longitude: lng },
                radius: 100
              }
            }
          })
        });
        
        const newData = await newResp.text();
        results.tests.google_new = {
          status: newResp.status,
          success: newResp.ok,
          response: newData.substring(0, 200) + '...'
        };
      } catch (error) {
        results.tests.google_new = {
          status: 'error',
          success: false,
          error: error.message
        };
      }
    } else {
      results.tests.google_legacy = { status: 'missing', success: false, error: 'GOOGLE_PLACES_KEY not configured' };
      results.tests.google_new = { status: 'missing', success: false, error: 'GOOGLE_PLACES_KEY not configured' };
    }

    // Test Foursquare API Key
    const foursquareKey = Deno.env.get('FSQ_SERVICE_KEY');
    if (foursquareKey) {
      console.log('[API Validator] Testing Foursquare API...');
      
      try {
        const fsqUrl = `https://api.foursquare.com/v3/places/nearby?ll=${lat},${lng}&radius=100&limit=1`;
        const fsqResp = await fetch(fsqUrl, {
          headers: { 
            'Accept': 'application/json', 
            'Authorization': foursquareKey 
          }
        });
        
        const fsqData = await fsqResp.text();
        results.tests.foursquare = {
          status: fsqResp.status,
          success: fsqResp.ok,
          response: fsqData.substring(0, 200) + '...'
        };
      } catch (error) {
        results.tests.foursquare = {
          status: 'error',
          success: false,
          error: error.message
        };
      }
    } else {
      results.tests.foursquare = { status: 'missing', success: false, error: 'FSQ_SERVICE_KEY not configured' };
    }

    console.log('[API Validator] Validation complete');
    
    return new Response(
      JSON.stringify(results, null, 2),
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('[API Validator] Unexpected error:', err);
    return new Response(
      JSON.stringify({ 
        error: 'Validation failed',
        details: err instanceof Error ? err.message : String(err)
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});