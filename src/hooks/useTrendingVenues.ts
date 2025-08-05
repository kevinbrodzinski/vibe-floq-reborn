import { useQuery } from '@tanstack/react-query';
import { fetchTrendingVenues, autoSyncVenues } from '@/lib/api/venues';
import { useGeo } from '@/hooks/useGeo';
import { useAuth } from '@/components/auth/EnhancedAuthProvider';

export const useTrendingVenues = (
  radiusM = 2_000,
  limit = 15,
  options: { autoSync?: boolean } = {}
) => {
  const { coords } = useGeo();
  const { user } = useAuth();
  const { autoSync = true } = options;

  return useQuery({
    enabled: !!coords,
    queryKey: ['trending', coords?.lat, coords?.lng, radiusM, limit],
    queryFn: async () => {
      if (!coords) throw new Error('No coordinates available');
      
      // Auto-sync venues in the background if enabled
      if (autoSync) {
        autoSyncVenues(coords.lat, coords.lng).catch(error => {
          console.warn('Background venue sync failed:', error);
          // Don't throw - we still want to return existing trending venues
        });
      }
      
      return fetchTrendingVenues(coords.lat, coords.lng, radiusM, limit);
    },
    staleTime: 30_000 // 30s is plenty – rows update via trigger anyway
  });
};