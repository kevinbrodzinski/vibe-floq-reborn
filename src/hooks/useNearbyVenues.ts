import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useNearbyVenues = (lat: number | null, lng: number | null, km: number = 1.2) =>
  useQuery({
    enabled: !!lat && !!lng,
    queryKey: ["nearby-venues", lat, lng, km],
    queryFn: async () => {
      if (!lat || !lng) return [];

      // 1) call edge function to ensure freshest data
      console.log(`Syncing places for location: ${lat}, ${lng}`);
      await supabase.functions.invoke("sync-places", { 
        body: { lat, lng } 
      });

      // 2) fetch venues within specified radius using our SQL function
      const radiusMeters = km * 1000; // Convert km to meters
      const { data, error } = await supabase
        .rpc("venues_within_radius", { 
          center_lat: lat, 
          center_lng: lng, 
          r_m: radiusMeters 
        });
        
      if (error) {
        console.error("Error fetching nearby venues:", error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} nearby venues`);
      return data || [];
    },
    staleTime: 60_000, // Cache for 1 minute
    retry: 1
  });