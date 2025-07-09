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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venue-details", venueId] });
      qc.invalidateQueries({ queryKey: ["presence-nearby"] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (lat == null || lng == null) throw new Error("Missing location data");
      // Keep current location but clear venue_id when leaving
      const { error } = await supabase.functions.invoke("upsert-presence", {
        body: { 
          lat, 
          lng, 
          venue_id: null, // Clear venue_id when leaving
          vibe: null // Optionally clear vibe too
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
