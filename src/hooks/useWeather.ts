import { useQuery } from '@tanstack/react-query';
import { getWeather } from '@/lib/api/weather';
import { useGeolocation } from '@/hooks/useGeolocation';

export const useWeather = () => {
  const { lat, lng, error: geoError, isLoading: geoLoading } = useGeolocation();
  
  return useQuery({
    queryKey: ['weather', lat, lng],
    enabled: !!lat && !!lng && !geoError,
    queryFn: () => getWeather(lat!, lng!),
    staleTime: 10 * 60_000, // 10 min
    retry: 2,
    onError: (error) => {
      console.error('Weather API error:', error);
    },
    onSuccess: (data) => {
      console.log('Weather data loaded:', data);
    }
  });
}; 