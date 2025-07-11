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
        "get-venue-people-list",
        {
          body: { venueId }
        }
      );

      if (error) {
        throw error;
      }

      return data || [];
    },
    enabled: !!venueId,
    staleTime: 10000,
    refetchInterval: 20000,
  });
};