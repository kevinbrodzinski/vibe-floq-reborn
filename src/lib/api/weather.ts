import { WeatherSnapshot } from '@/types/weather';
import { supabase } from '@/integrations/supabase/client';

// Use Supabase Edge Function for weather data with 15-minute client-side caching
let weatherCache: { data: WeatherSnapshot; timestamp: number; lat: number; lng: number } | null = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export async function getWeather(lat: number, lng: number): Promise<WeatherSnapshot> {
  // Check cache first
  const now = Date.now();
  if (weatherCache && 
      now - weatherCache.timestamp < CACHE_DURATION &&
      Math.abs(weatherCache.lat - lat) < 0.01 &&
      Math.abs(weatherCache.lng - lng) < 0.01) {
    return weatherCache.data;
  }

  try {
    const { data, error } = await supabase.functions.invoke('fetch-weather', {
      body: { lat, lng },
    });

    if (error) {
      throw new Error('Weather fetch failed');
    }

    // Cache the result
    const weatherData = data as WeatherSnapshot;
    weatherCache = { data: weatherData, timestamp: now, lat, lng };
    
    return weatherData;
  } catch (error) {
    console.error('Weather API error:', error);
    // Return fallback data
    const fallbackData = {
      condition: 'clear' as const,
      temperatureF: 70,
      feelsLikeF: 70,
      humidity: 50,
      windMph: 5,
      precipitationMm: 0,
      visibilityKm: 10,
      icon: '01d',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Cache fallback too to avoid repeated failures
    weatherCache = { data: fallbackData, timestamp: now, lat, lng };
    return fallbackData;
  }
}

// Helper to get current weather modulation factors
export function getWeatherModulation(weather: WeatherSnapshot) {
  const precipMod = (weather.precipitationMm ?? 0) > 0.2 ? 0.85 : 1.0; // Rain reduces alpha
  const visMod = (weather.visibilityKm ?? 10) < 3 ? 1.15 : 1.0; // Fog increases tint
  const windMod = weather.windMph > 20 ? 1.1 : 1.0; // High wind increases motion
  
  return { precipMod, visMod, windMod };
}