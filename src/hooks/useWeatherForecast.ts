import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGeo } from '@/hooks/useGeo';
import type { TimeOption } from '@/components/pulse/DateTimeSelector';

export interface WeatherForecast {
  condition: string;
  temperatureF: number;
  feelsLikeF: number;
  humidity: number;
  windMph: number;
  precipitationChance: number;
  icon: string;
  created_at: string;
  forecastTime: string; // ISO timestamp for when this forecast is for
}

/**
 * Gets the target datetime for a given time option
 */
const getTargetDateTime = (timeOption: TimeOption): Date => {
  const now = new Date();
  
  switch (timeOption) {
    case 'now':
      return now;
      
    case 'tonight':
      // Tonight at 8 PM
      const tonight = new Date(now);
      tonight.setHours(20, 0, 0, 0);
      // If it's already past 8 PM, use current time
      if (now.getHours() >= 20) {
        return now;
      }
      return tonight;
      
    case 'tomorrow':
      // Tomorrow at 8 PM
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(20, 0, 0, 0);
      return tomorrow;
      
    case 'weekend':
      // Next Saturday at 2 PM
      const weekend = new Date(now);
      const daysUntilSaturday = (6 - now.getDay()) % 7;
      const targetDay = daysUntilSaturday === 0 ? 7 : daysUntilSaturday; // If today is Saturday, get next Saturday
      weekend.setDate(weekend.getDate() + targetDay);
      weekend.setHours(14, 0, 0, 0);
      return weekend;
      
    case 'custom':
      // For custom, we'll use current time as fallback
      return now;
      
    default:
      return now;
  }
};

/**
 * Fetches weather forecast for a specific time period
 */
export const useWeatherForecast = (timeOption: TimeOption = 'now') => {
  const { coords, error: geoError } = useGeo();
  const lat = coords?.lat;
  const lng = coords?.lng;
  
  const targetDateTime = getTargetDateTime(timeOption);
  const isCurrentWeather = timeOption === 'now';

  return useQuery<WeatherForecast>({
    queryKey: ['weather-forecast', lat, lng, timeOption, targetDateTime.getTime()],
    
    enabled: lat !== undefined && lng !== undefined && !geoError,
    
    queryFn: async ({ signal }) => {
      // For current weather, use the existing endpoint
      if (isCurrentWeather) {
        const { data, error } = await supabase.functions.invoke<WeatherForecast>(
          'get_weather',
          {
            body: { lat, lng },
            signal,
          },
        );
        
        if (error) throw new Error(error.message);
        if (!data) throw new Error('No weather data returned');
        
        return {
          ...data,
          forecastTime: new Date().toISOString(),
          precipitationChance: data.precipitationChance || 0
        };
      }
      
      // For future weather, we'll try to use a forecast endpoint
      // If it doesn't exist, fall back to current weather with a note
      try {
        const { data, error } = await supabase.functions.invoke<WeatherForecast>(
          'get_weather_forecast',
          {
            body: { 
              lat, 
              lng, 
              targetTime: targetDateTime.toISOString(),
              timeOption 
            },
            signal,
          },
        );
        
        if (error) throw new Error(error.message);
        if (!data) throw new Error('No forecast data returned');
        
        return {
          ...data,
          forecastTime: targetDateTime.toISOString(),
          precipitationChance: data.precipitationChance || 0
        };
      } catch (forecastError) {
        // Fallback to current weather if forecast endpoint doesn't exist
        console.warn(`Weather forecast not available for ${timeOption}, using current weather:`, forecastError);
        
        const { data, error } = await supabase.functions.invoke<WeatherForecast>(
          'get_weather',
          {
            body: { lat, lng },
            signal,
          },
        );
        
        if (error) throw new Error(error.message);
        if (!data) throw new Error('No weather data returned');
        
        return {
          ...data,
          forecastTime: targetDateTime.toISOString(),
          precipitationChance: data.precipitationChance || 0,
          // Add a note that this is current weather, not forecast
          condition: `${data.condition} (current)`
        };
      }
    },
    
    staleTime: isCurrentWeather ? 10 * 60_000 : 30 * 60_000, // Current: 10min, Forecast: 30min
    cacheTime: isCurrentWeather ? 30 * 60_000 : 60 * 60_000, // Current: 30min, Forecast: 1hr
    refetchOnWindowFocus: false,
    retry: 2,
    
    meta: { errorMessage: `Failed to fetch weather forecast for ${timeOption}` },
  });
};