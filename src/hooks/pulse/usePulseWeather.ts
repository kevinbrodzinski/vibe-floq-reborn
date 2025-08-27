import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useGeo } from '@/hooks/useGeo'
import type { WeatherNow, WeatherForecast } from '@/types/pulse'

export const usePulseWeatherNow = () => {
  const { coords } = useGeo()
  
  return useQuery<WeatherNow>({
    queryKey: ['weather:pulse:now', coords?.lat, coords?.lng],
    enabled: !!coords,
    staleTime: 10 * 60_000, // 10 minutes
    queryFn: async (): Promise<WeatherNow> => {
      const { data, error } = await supabase.functions.invoke('get_weather', {
        body: { lat: coords!.lat, lng: coords!.lng }
      })
      if (error) throw error
      if (!data) throw new Error('No weather data returned')
      
      return {
        condition: data.condition || 'unknown',
        temperatureF: data.temperatureF || 70,
        feelsLikeF: data.feelsLikeF || data.temperatureF || 70,
        humidity: data.humidity || 50,
        windMph: data.windMph || 0,
        precipitationChance: data.precipitationChance || 0,
        created_at: data.created_at || new Date().toISOString()
      }
    }
  })
}

export const usePulseWeatherForecast = (selectedTime?: string) => {
  const { coords } = useGeo()
  
  return useQuery<WeatherForecast[]>({
    queryKey: ['weather:pulse:forecast', coords?.lat, coords?.lng, selectedTime],
    enabled: !!coords && selectedTime !== 'now',
    staleTime: 30 * 60_000, // 30 minutes
    queryFn: async (): Promise<WeatherForecast[]> => {
      // For now, return mock forecast data - would integrate with actual forecast API
      const mockForecast: WeatherForecast[] = [
        {
          forecastTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          temperatureF: 72,
          precipitationChance: 20,
          condition: 'partly_cloudy'
        }
      ]
      return mockForecast
    }
  })
}