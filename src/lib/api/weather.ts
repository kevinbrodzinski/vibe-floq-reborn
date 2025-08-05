import { WeatherSnapshot } from '@/types/weather';
import { supabase } from '@/integrations/supabase/client';

// Use Supabase Edge Function for weather data
export async function getWeather(lat: number, lng: number): Promise<WeatherSnapshot> {
  try {
    const { data, error } = await supabase.functions.invoke('get_weather', {
      body: { lat, lng },
    });

    if (error) {
      throw new Error('Weather fetch failed');
    }

    return data as WeatherSnapshot;
  } catch (error) {
    console.error('Weather API error:', error);
    // Return fallback data
    return {
      condition: 'clear',
      temperatureF: 70,
      feelsLikeF: 70,
      humidity: 50,
      windMph: 5,
      icon: '01d',
      created_at: new Date().toISOString()
    };
  }
}