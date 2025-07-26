import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Participant {
  user_id: string;
  avatar_url: string | null;
}

export const useFloqParticipants = (floqId?: string, limit = 6) =>
  useQuery<Participant[]>({
    queryKey: ["floq_participants", floqId, limit],
    enabled: !!floqId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get_floq_participants', {
        body: {
          floq_id: floqId,
          limit,
        },
      });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });