import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGeo } from '@/hooks/useGeo';

export const useWeather = () => {
  const { coords, error: geoError, status } = useGeo();
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