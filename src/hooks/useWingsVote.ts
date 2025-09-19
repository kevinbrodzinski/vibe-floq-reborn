import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWingsVote(floqId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, optionIdx }: { eventId: string; optionIdx: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");
      
      const { error } = await supabase
        .from("floq_wings_votes")
        .upsert({ 
          event_id: eventId, 
          profile_id: user.id,
          option_idx: optionIdx 
        });
      if (error) throw error;
      return { eventId, optionIdx };
    },
    onSuccess: ({ eventId }) => {
      // Refresh stream and optional tally
      qc.invalidateQueries({ queryKey: ["smart-stream", floqId], exact: false });
      qc.invalidateQueries({ queryKey: ["wings-tally", eventId] });
    }
  });
}