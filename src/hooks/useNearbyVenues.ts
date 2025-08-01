import { useQuery } from "@tanstack/react-query";
import { supabase }  from "@/integrations/supabase/client";

export function useNearbyVenues(lat: number, lng: number, radius = 1000) {
  return useQuery({
    queryKey: ["nearby-venues", lat, lng, radius],
    enabled:  Number.isFinite(lat) && Number.isFinite(lng),
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_nearby_venues", { p_lat: lat, p_lng: lng, p_radius: radius });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,   // 30 s
  });
}