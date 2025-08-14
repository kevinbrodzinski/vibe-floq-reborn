import { useQuery } from "@tanstack/react-query";
import { supabase }  from "@/integrations/supabase/client";

export type FilterLogic = 'any' | 'all';

interface NearbyVenuesOptions {
  pillKeys?: string[];
  filterLogic?: FilterLogic;
  limit?: number;
}

export function useNearbyVenues(
  lat: number, 
  lng: number, 
  radiusKm = 1, 
  options: NearbyVenuesOptions = {}
) {
  const { pillKeys = [], filterLogic = 'any', limit = 50 } = options;
  
  return useQuery({
    queryKey: ["nearby-venues", lat, lng, radiusKm, pillKeys, filterLogic, limit],
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
    queryFn: async () => {
      const radiusM = Math.round(radiusKm * 1000);
      const anyTags = filterLogic === 'any' && pillKeys.length ? pillKeys : null;
      const allTags = filterLogic === 'all' && pillKeys.length ? pillKeys : null;

      // Calls 6-arg RPC: (p_lat, p_lng, p_radius_m, p_limit, p_any_tags, p_all_tags)
      const { data, error } = await supabase.rpc('get_nearby_venues', {
        p_lat: lat,
        p_lng: lng,
        p_radius_m: radiusM,
        p_limit: limit,
        p_any_tags: anyTags,
        p_all_tags: allTags
      });
      if (error) throw error;
      return (data ?? []);
    },
    staleTime: 2 * 60_000,      // 2 minutes - venues don't change that often
    cacheTime: 10 * 60_000,     // 10 minutes - keep cached for longer
    refetchOnWindowFocus: false, // Don't refetch when user returns to tab
    retry: 1,                    // Reduce retry attempts for faster failure
  });
}