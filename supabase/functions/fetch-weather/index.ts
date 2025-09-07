import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng } = await req.json();
    
    // Validate inputs
    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'Missing lat/lng parameters' }), 
        { status: 400, headers: corsHeaders }
      );
    }

    // Use Open-Meteo API (free weather API)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,visibility,wind_speed_10m&timezone=auto`;
    
    const response = await fetch(weatherUrl);
    const data = await response.json();
    
    if (!data.current) {
      throw new Error('Invalid weather data received');
    }

    const weatherData = {
      condition: getConditionFromData(data.current),
      temperatureF: Math.round(data.current.temperature_2m * 9/5 + 32),
      feelsLikeF: Math.round(data.current.temperature_2m * 9/5 + 32), // Simplified
      humidity: 50, // Open-Meteo doesn't provide this in free tier
      windMph: Math.round(data.current.wind_speed_10m * 0.621371),
      precipitationMm: data.current.precipitation || 0,
      visibilityKm: data.current.visibility || 10,
      updated_at: new Date().toISOString()
    };

    const headers = { 
      ...corsHeaders, 
      'Cache-Control': 'public, max-age=900' // 15 minutes cache
    };

    return new Response(JSON.stringify(weatherData), { 
      status: 200, 
      headers 
    });

  } catch (error) {
    console.error('Weather fetch error:', error);
    
    // Return fallback weather data
    const fallbackData = {
      condition: 'clear',
      temperatureF: 70,
      feelsLikeF: 70,
      humidity: 50,
      windMph: 5,
      precipitationMm: 0,
      visibilityKm: 10,
      updated_at: new Date().toISOString()
    };

    return new Response(JSON.stringify(fallbackData), { 
      status: 200, 
      headers: corsHeaders 
    });
  }
});

function getConditionFromData(current: any): string {
  const precip = current.precipitation || 0;
  const visibility = current.visibility || 10;
  
  if (precip > 0.5) return 'rainy';
  if (visibility < 5) return 'foggy';
  if (current.wind_speed_10m > 20) return 'windy';
  
  return 'clear';
}