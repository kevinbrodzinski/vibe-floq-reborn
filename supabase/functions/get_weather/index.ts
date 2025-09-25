/// <reference lib="dom" />
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as geohash from "https://esm.sh/ngeohash@0.6.3";
import { corsHeadersFor, handlePreflight } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchFromOpenWeatherMap(lat: number, lng: number) {
  const apiKey = Deno.env.get("WEATHER_API_KEY");
  if (!apiKey) {
    throw new Error("WEATHER_API_KEY environment variable is not configured");
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("units", "imperial");        // °F / mph
  url.searchParams.set("appid", apiKey);

  const r = await fetch(url.href);
  if (!r.ok) throw new Error(`OpenWeatherMap API error: ${r.status}`);

  const w = await r.json();
  
  // Normalize the response
  return {
    condition: w.weather?.[0]?.main?.toLowerCase() ?? "sunny",
    temperatureF: Math.round(w.main.temp),
    feelsLikeF: Math.round(w.main.feels_like),
    humidity: w.main.humidity,
    windMph: Math.round(w.wind.speed),
    icon: w.weather?.[0]?.icon ?? "01d",
    created_at: new Date().toISOString(),
  };
}

serve(async req => {
  const pf = handlePreflight(req);
  if (pf) return pf;

  try {
    const body = await req.json().catch(() => ({}));
    const { lat, lng } = body;
    
    if (typeof lat !== "number" || typeof lng !== "number") {
      console.error("[weather] Invalid input:", { lat, lng });
      const headers = corsHeadersFor(req);
      return new Response(
        JSON.stringify({ error: "Valid lat/lng numbers required" }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } },
      );
    }

    // 1. Generate geohash6 for this location (≈ 1 km²)
    const geohash6 = geohash.encode(lat, lng, 6);
    console.log(`[weather] Checking cache for geohash6: ${geohash6}`);

    // 2. Try cache first (10-minute TTL)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: cached, error: cacheError } = await supabase
      .from('weather_cache')
      .select('payload')
      .eq('geohash6', geohash6)
      .gt('fetched_at', tenMinutesAgo)
      .maybeSingle();

    if (cacheError) {
      console.error("[weather] Cache query error:", cacheError);
    }

    if (cached) {
      console.log(`[weather] Cache hit for ${geohash6}`);
      const headers = corsHeadersFor(req);
      return new Response(JSON.stringify(cached.payload), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // 3. Cache miss - fetch from OpenWeatherMap
    console.log(`[weather] Cache miss for ${geohash6}, fetching from API`);
    const weatherData = await fetchFromOpenWeatherMap(lat, lng);

    // 4. Upsert to cache
    const { error: upsertError } = await supabase
      .from('weather_cache')
      .upsert({ 
        geohash6, 
        payload: weatherData,
        fetched_at: new Date().toISOString()
      });

    if (upsertError) {
      console.error("[weather] Cache upsert error:", upsertError);
      // Continue anyway, just log the error
    } else {
      console.log(`[weather] Cached fresh data for ${geohash6}`);
    }

    const headers = corsHeadersFor(req);
    return new Response(JSON.stringify(weatherData), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[weather] Error:", err);
    
    // Enhanced error response based on error type
    let errorMessage = "weather fetch failed";
    let statusCode = 500;
    
    if (err.message.includes("WEATHER_API_KEY")) {
      errorMessage = "Weather service not configured";
      statusCode = 503;
    } else if (err.message.includes("OpenWeatherMap API error")) {
      errorMessage = "Weather service temporarily unavailable";
      statusCode = 502;
    }
    
    const headers = corsHeadersFor(req);
    return new Response(
      JSON.stringify({ error: errorMessage, details: err.message }),
      { status: statusCode, headers: { ...headers, 'Content-Type': 'application/json' } },
    );
  }
});