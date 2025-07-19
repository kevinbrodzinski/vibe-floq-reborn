import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VenuePerson {
  user_id: string;
  vibe: string;
  checked_in_at: string;
  session_duration: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

export const useVenuePeople = (venueId: string | null) => {
  return useQuery({
    queryKey: ["venue-people", venueId],
    queryFn: async (): Promise<VenuePerson[]> => {
      if (!venueId) {
        throw new Error("Venue ID is required");
      }

      const { data, error } = await supabase.functions.invoke(
        "get-venue-intelligence",
        {
          body: { venue_id: venueId, mode: "people" }
        }
      );

      if (error) {
        console.error('useVenuePeople error:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!venueId,
    staleTime: 30000,
    refetchInterval: 60000,
    retry: (failureCount, error) => {
      console.log('useVenuePeople retry attempt:', failureCount, error?.message);
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
  });
};