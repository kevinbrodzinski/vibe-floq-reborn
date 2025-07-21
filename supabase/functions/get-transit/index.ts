import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const MAPBOX_TOKEN = Deno.env.get('MAPBOX_ACCESS_TOKEN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransitRequest {
  from: {
    lng: number;
    lat: number;
  };
  to: {
    lng: number;
    lat: number;
  };
  mode?: 'walking' | 'driving' | 'cycling';
}

interface TransitResponse {
  duration_minutes: number;
  distance_meters: number;
  provider: string;
  confidence: 'high' | 'medium' | 'low';
  mode: string;
  raw_data?: any;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!MAPBOX_TOKEN) {
    console.error('MAPBOX_ACCESS_TOKEN not configured');
    return new Response(
      JSON.stringify({ error: 'Mapbox token not configured' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const { from, to, mode = 'walking' }: TransitRequest = await req.json();

    // Validate coordinates
    if (!from?.lng || !from?.lat || !to?.lng || !to?.lat) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Map modes to Mapbox profiles
    const profileMap = {
      'walking': 'mapbox/walking',
      'driving': 'mapbox/driving',
      'cycling': 'mapbox/cycling'
    };

    const profile = profileMap[mode] || profileMap.walking;
    
    // Build Mapbox Directions API URL
    const mapboxUrl = new URL(`https://api.mapbox.com/directions/v5/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}`);
    mapboxUrl.searchParams.set('geometries', 'geojson');
    mapboxUrl.searchParams.set('overview', 'simplified');
    mapboxUrl.searchParams.set('access_token', MAPBOX_TOKEN);

    console.log(`Fetching transit data: ${mode} from ${from.lat},${from.lng} to ${to.lat},${to.lng}`);

    const mapboxResponse = await fetch(mapboxUrl.toString());
    
    if (!mapboxResponse.ok) {
      console.error('Mapbox API error:', mapboxResponse.status, await mapboxResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch transit data from Mapbox' }),
        { 
          status: mapboxResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const mapboxData = await mapboxResponse.json();
    
    // Extract the first route (best route)
    const route = mapboxData.routes?.[0];
    
    if (!route) {
      console.warn('No route found between coordinates');
      return new Response(
        JSON.stringify({ error: 'No route found between these locations' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate duration in minutes (Mapbox returns seconds)
    const durationMinutes = Math.round(route.duration / 60);
    const distanceMeters = Math.round(route.distance);

    // Determine confidence based on route quality
    let confidence: 'high' | 'medium' | 'low' = 'high';
    if (durationMinutes === 0 || distanceMeters === 0) {
      confidence = 'low';
    } else if (durationMinutes < 2) {
      confidence = 'medium';
    }

    const response: TransitResponse = {
      duration_minutes: Math.max(1, durationMinutes), // Minimum 1 minute
      distance_meters: distanceMeters,
      provider: 'mapbox',
      confidence,
      mode,
      raw_data: route // Include for debugging/caching
    };

    console.log(`Transit calculated: ${durationMinutes}min, ${distanceMeters}m for ${mode}`);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        }
      }
    );

  } catch (error: any) {
    console.error('Error in get-transit function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);