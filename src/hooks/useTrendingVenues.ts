import { useQuery } from '@tanstack/react-query';
import { fetchTrendingVenues, autoSyncVenues } from '@/lib/api/venues';
import { useGeo } from '@/hooks/useGeo';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface TrendingVenuesOptions {
  autoSync?: boolean;
  pillKeys?: string[];
  filterLogic?: 'any' | 'all';
}

export const useTrendingVenues = (
  radiusM = 2_000,
  limit = 15,
  options: TrendingVenuesOptions = {}
) => {
  const { coords } = useGeo();
  const { user } = useAuth();
  const { autoSync = true, pillKeys = [], filterLogic = 'any' } = options;

  return useQuery({
    enabled: !!coords,
    queryKey: ['trending', coords?.lat, coords?.lng, radiusM, limit, pillKeys, filterLogic],
    queryFn: async () => {
      if (!coords) throw new Error('No coordinates available');
      
      // Auto-sync venues in the background if enabled
      if (autoSync) {
        autoSyncVenues(coords.lat, coords.lng).catch(error => {
          console.warn('Background venue sync failed:', error);
          // Don't throw - we still want to return existing trending venues
        });
      }
      
      // Try enhanced RPC with pill-based filtering first
      if (pillKeys.length > 0) {
        try {
          const { data, error } = await supabase
            .rpc("get_trending_venues_enriched", {
              p_lat: coords.lat,
              p_lng: coords.lng,
              p_radius_m: radiusM,
              p_limit: limit,
              p_any_tags: filterLogic === 'any' ? pillKeys : [],
              p_all_tags: filterLogic === 'all' ? pillKeys : []
            });
          
          if (error) {
            // If enhanced RPC doesn't exist, fall back to original method
            if (error.message.includes('function') || error.message.includes('does not exist')) {
              return fetchTrendingVenues(coords.lat, coords.lng, radiusM, limit);
            }
            throw error;
          }
          
          return data || [];
        } catch (err) {
          console.warn('Enhanced trending venues failed, falling back:', err);
          return fetchTrendingVenues(coords.lat, coords.lng, radiusM, limit);
        }
      }
      
      // Default to original implementation
      return fetchTrendingVenues(coords.lat, coords.lng, radiusM, limit);
    },
    staleTime: 30_000 // 30s is plenty – rows update via trigger anyway
  });
};