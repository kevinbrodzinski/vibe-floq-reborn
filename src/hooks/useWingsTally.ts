import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns [{ option_idx, votes }, ...] and auto-refreshes on new votes.
 */
export function useWingsTally(eventId: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["wings-tally", eventId],
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("wings_poll_tally", { p_event_id: eventId });
      if (error) throw error;
      return (data ?? []) as { option_idx: number; votes: number }[];
    },
  });

  // Live invalidate on INSERT/UPSERT for this poll
  useEffect(() => {
    if (!eventId) return;
    const ch = supabase
      .channel(`wings:tally:${eventId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "floq_wings_votes",
        filter: `event_id=eq.${eventId}`
      }, () => {
        qc.invalidateQueries({ queryKey: ["wings-tally", eventId] });
      })
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [eventId, qc]);

  return query;
}