import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedLocation } from '@/hooks/location/useUnifiedLocation';

export const useWeather = () => {
  const { coords, error: geoError, status } = useUnifiedLocation({
    hookId: 'useWeather',
    enableTracking: false,
    enablePresence: false
  });
  const lat = coords?.lat;
  const lng = coords?.lng;
  const geoLoading = status === 'loading';
  
  return useQuery({
    queryKey: ['weather', lat, lng],
    enabled: !!lat && !!lng && !geoError,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get_weather', {
        body: { lat, lng },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60_000, // 10 min
    retry: 2,
    meta: { errorMessage: 'Failed to fetch weather data' }
  });
};