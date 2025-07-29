import { WeatherSnapshot } from '@/types/weather';

// Use Supabase Edge Function for weather data
export async function getWeather(lat: number, lng: number): Promise<WeatherSnapshot> {
  try {
    const response = await fetch('/functions/v1/get_weather', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lat, lng }),
    });

    if (!response.ok) {
      throw new Error('Weather fetch failed');
    }

    const data = await response.json();
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