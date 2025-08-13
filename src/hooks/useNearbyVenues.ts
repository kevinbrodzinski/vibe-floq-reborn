import { useQuery } from "@tanstack/react-query";
import { supabase }  from "@/integrations/supabase/client";

interface NearbyVenuesOptions {
  pillKeys?: string[];
  filterLogic?: 'any' | 'all';
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
      const radiusM = Math.round(radiusKm * 1000); // Convert km to meters
      
      // Check if enhanced filtering RPC exists, fallback to basic version
      try {
        // Try enhanced version with pill-based filtering
        const { data, error } = await supabase
          .rpc("get_nearby_venues", { 
            p_lat: lat, 
            p_lng: lng, 
            p_radius_m: radiusM,
            p_any_tags: filterLogic === 'any' ? pillKeys : [],
            p_all_tags: filterLogic === 'all' ? pillKeys : [],
            p_limit: limit
          });
        
        if (error) {
          // If enhanced RPC doesn't exist, fall back to basic version
          if (error.message.includes('function') || error.message.includes('does not exist')) {
            const { data: fallbackData, error: fallbackError } = await supabase
              .rpc("get_nearby_venues", { p_lat: lat, p_lng: lng, p_radius_m: radiusM });
            if (fallbackError) throw fallbackError;
            return fallbackData || [];
          }
          throw error;
        }
        
        return data || [];
      } catch (err) {
        // Final fallback to basic version
        const { data, error } = await supabase
          .rpc("get_nearby_venues", { p_lat: lat, p_lng: lng, p_radius_m: radiusM });
        if (error) throw error;
        return data || [];
      }
    },
    staleTime: 30_000,   // 30 s
  });
}