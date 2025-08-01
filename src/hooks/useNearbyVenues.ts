import { useQuery } from "@tanstack/react-query";
import { supabase }  from "@/integrations/supabase/client";

export function useNearbyVenues(lat: number, lng: number, radiusKm = 1) {
  return useQuery({
    queryKey: ["nearby-venues", lat, lng, radiusKm],
    enabled:  Number.isFinite(lat) && Number.isFinite(lng),
    queryFn: async () => {
      const radiusM = Math.round(radiusKm * 1000); // Convert km to meters
      const { data, error } = await supabase
        .rpc("get_nearby_venues", { p_lat: lat, p_lng: lng, p_radius_m: radiusM });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,   // 30 s
  });
}