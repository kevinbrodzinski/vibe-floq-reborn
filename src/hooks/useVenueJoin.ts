import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface JoinOptions {
  // allow caller to override vibe if they like
  vibeOverride?: string | null;
}

/**
 * Enhanced venue join hook that sets venue_id in presence when joining/leaving venues.
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
          venue_id: venueId, // Set venue_id when joining
          vibe: opts?.vibeOverride ?? null,
        },
      });
      if (error) throw error;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["venue-details", venueId] });
      const prev = qc.getQueryData(["venue-details", venueId]);
      if (prev && venueId) {
        qc.setQueryData(["venue-details", venueId], (d: any) => ({
          ...d,
          live_count: d.live_count + 1
        }));
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["venue-details", venueId], ctx.prev);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venue-details", venueId] });
      qc.invalidateQueries({ queryKey: ["presence-nearby"] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      // Clear venue_id only (don't send location or clear vibe)
      const { error } = await supabase.functions.invoke("upsert-presence", {
        body: { 
          lat: lat!, 
          lng: lng!, 
          venue_id: null, // Clear venue_id when leaving
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venue-details", venueId] });
      qc.invalidateQueries({ queryKey: ["presence-nearby"] });
    },
  });

  return {
    join: joinMutation.mutateAsync,
    joinPending: joinMutation.isPending,
    leave: leaveMutation.mutateAsync,
    leavePending: leaveMutation.isPending,
  };
}
