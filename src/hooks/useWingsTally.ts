import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWingsTally(eventId: string) {
  return useQuery({
    queryKey: ["wings-tally", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("wings_poll_tally", { p_event_id: eventId });
      if (error) throw error;
      return data as { option_idx: number; votes: number }[];
    },
    staleTime: 15_000
  });
}