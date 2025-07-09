import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface JoinOptions {
  // allow caller to override vibe if they like
  vibeOverride?: string | null;
}

/**
 * Simply pumps the venue lat/lng into the existing upsert-presence edge function.
 * Returns {join, leave, status}
 */
export function useVenueJoin(venueId: string | null, lat: number | null, lng: number | null) {
  const qc = useQueryClient();

  const joinMutation = useMutation({
    mutationFn: async (opts?: JoinOptions) => {
      if (!venueId || lat == null || lng == null) throw new Error("Missing venue data");
      const { error } = await supabase.functions.invoke("upsert-presence", {
        body: {
          lat,
          lng,
          venue_id: venueId,
          vibe: opts?.vibeOverride ?? null,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venue-details", venueId] });
      qc.invalidateQueries({ queryKey: ["presence-nearby"] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      // send lat/lng as null ⇒ edge fn will mark you "offline"
      const { error } = await supabase.functions.invoke("upsert-presence", {
        body: { lat: null, lng: null, venue_id: null },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venue-details", venueId] });
      qc.invalidateQueries({ queryKey: ["presence-nearby"] });
    },
  });

  return {
    join:  joinMutation.mutateAsync,
    joinPending:  joinMutation.isPending,
    leave: leaveMutation.mutateAsync,
    leavePending: leaveMutation.isPending,
  };
}