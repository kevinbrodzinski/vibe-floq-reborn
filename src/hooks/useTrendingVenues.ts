import { useQuery } from '@tanstack/react-query';
import { fetchTrendingVenues } from '@/lib/api/venues';
import { useGeo } from '@/hooks/useGeo';

export const useTrendingVenues = (
  radiusM = 2_000,
  limit = 15
) => {
  const { coords } = useGeo();

  return useQuery({
    enabled: !!coords,
    queryKey: ['trending', coords?.lat, coords?.lng, radiusM, limit],
    queryFn: () =>
      fetchTrendingVenues(coords!.lat, coords!.lng, radiusM, limit),
    staleTime: 30_000 // 30s is plenty – rows update via trigger anyway
  });
};