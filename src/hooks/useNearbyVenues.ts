import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Venue {
  id: string;
  name: string;
  distance_m?: number;
  [key: string]: any;
}

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
  
  return useQuery<Venue[]>({
    queryKey: ["nearby-venues", lat, lng, radiusKm, pillKeys, filterLogic, limit],
    enabled: Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0,
    queryFn: async () => {
      const radiusM = Math.round(radiusKm * 1000);
      const anyTags = filterLogic === 'any' && pillKeys.length ? pillKeys : null;
      const allTags = filterLogic === 'all' && pillKeys.length ? pillKeys : null;

      // Calls 6-arg RPC: (p_lat, p_lng, p_radius_m, p_limit, p_any_tags, p_all_tags)
      const { data, error } = await supabase.rpc('get_nearby_venues' as any, {
        p_lat: lat,
        p_lng: lng,
        p_radius_m: radiusM,
        p_limit: limit,
        p_any_tags: anyTags,
        p_all_tags: allTags
      });
      if (error) throw error;
      
      // Ensure we always return array
      const venues = Array.isArray(data) ? data : (data ? [data] : [])
      return venues as Venue[];
    },
    staleTime: 5 * 60_000,      // 5 minutes - venues don't change often
    gcTime: 30 * 60_000,        // 30 minutes - keep cached much longer (renamed from cacheTime)
    refetchOnWindowFocus: false, // Don't refetch when user returns to tab
    refetchOnMount: false,       // Don't refetch on component mount if data exists
    refetchOnReconnect: false,   // Don't refetch when network reconnects
    retry: 1,                    // Reduce retry attempts for faster failure
    networkMode: 'offlineFirst', // Use cache first, then network
  });
}