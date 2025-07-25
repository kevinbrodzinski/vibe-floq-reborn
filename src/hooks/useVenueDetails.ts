import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VenueDetails {
  id: string;
  name: string;
  vibe?: string;
  description?: string;
  live_count: number;
  vibe_score: number;
  popularity: number;
  lat: number;
  lng: number;
}

export const useVenueDetails = (venueId: string | null) => {
  return useQuery({
    queryKey: ["venue-details", venueId],
    queryFn: async (): Promise<VenueDetails> => {
      if (!venueId) {
        throw new Error("Venue ID is required");
      }

      const { data, error } = await supabase
        .rpc("venue_details", { v_id: venueId })
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Venue not found");
      }

      return {
        ...data,
        vibe_score: (data as any).vibe_score || 50,
        popularity: (data as any).popularity || 0
      };
    },
    enabled: !!venueId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute to keep live count updated
  });
};