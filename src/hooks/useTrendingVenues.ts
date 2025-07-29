import { useQuery } from '@tanstack/react-query';
import { fetchTrendingVenues } from '@/lib/api/pulse';
import { useGeolocation } from '@/hooks/useGeolocation';

export const useTrendingVenues = (radius = 2000, limit = 5) => {
  const { lat, lng } = useGeolocation();
  return useQuery({
    queryKey : ['trending', lat, lng, radius, limit],
    enabled  : !!lat && !!lng,
    queryFn  : () => fetchTrendingVenues(lat!, lng!, radius, limit),
    staleTime: 30_000
  });
}; 