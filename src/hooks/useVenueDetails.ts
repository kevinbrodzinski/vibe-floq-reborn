import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { devLog, devError, devWarn } from "@/utils/devLog";

export interface VenueDetails {
  id: string;
  name: string;
  vibe?: string;
  description?: string;
  live_count: number;
  vibe_score: number;
  popularity: number;
  lat: number | null;
  lng: number | null;
}

export const useVenueDetails = (venueId: string | null) => {
  return useQuery({
    queryKey: ["venue-details", venueId],
    queryFn: async (): Promise<VenueDetails> => {
      if (!venueId) {
        throw new Error("Venue ID is required");
      }

      devLog(`🏢 Fetching venue details for: ${venueId}`);

      const { data, error } = await supabase
        .rpc("venue_details", { p_venue_id: venueId })
        .single();

      if (error) {
        devError(`❌ Failed to fetch venue details for ${venueId}:`, error);
        throw error;
      }

      if (!data) {
        devWarn(`⚠️ No venue data found for ID: ${venueId}`);
        throw new Error("Venue not found");
      }

      devLog(`✅ Successfully fetched venue details:`, data);

      // Transform and validate the data
      const venueDetails: VenueDetails = {
        id: data.id,
        name: data.name || 'Unknown Venue',
        vibe: data.vibe || undefined,
        description: data.description || undefined,
        live_count: Number(data.live_count) || 0,
        vibe_score: Number(data.vibe_score) || 50,
        popularity: Number(data.popularity) || 0,
        lat: data.lat ?? null,
        lng: data.lng ?? null
      };

      return venueDetails;
    },
    enabled: !!venueId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute to keep live count updated
    retry: (failureCount, error) => {
      // Don't retry if venue not found
      if (error instanceof Error && error.message === 'Venue not found') {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    }
  });
};