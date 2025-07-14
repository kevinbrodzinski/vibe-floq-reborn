import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { debounce } from "@/utils/timing";

/**
 * Hook that returns a debounced tracker.
 *
 * ```ts
 * const track = useActivityTracking(floqId);
 * track('chat'); // mark chat viewed
 * ```
 */
export const useActivityTracking = (floqId: string) => {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const debouncedRef = useRef<ReturnType<typeof debounce> | null>(null);

  const mutation = useMutation({
    mutationFn: async (section: 'chat' | 'activity' | 'plans' | 'all') => {
      const { error } = await supabase.rpc('update_user_activity_tracking', {
        p_floq_id: floqId,
        p_section: section,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      const userId = session?.user?.id;
      // Refresh badge data for this floq + global aggregates with correct keys
      queryClient.invalidateQueries({ queryKey: ['unread-counts', floqId, userId] });
      queryClient.invalidateQueries({ queryKey: ['my-floqs-unread', userId] });
    },
  });

  // Create stable debounced function - only recreate when mutation or floqId changes
  const debouncedTracker = useMemo(() => {
    return debounce((section: 'chat' | 'activity' | 'plans' | 'all' = 'all') => {
      mutation.mutate(section);
    }, 300);
  }, [mutation, floqId]);

  // Store ref for cleanup
  debouncedRef.current = debouncedTracker;

  // Cleanup debounced timer on unmount
  useEffect(() => {
    return () => {
      if (debouncedRef.current) {
        debouncedRef.current.clear();
      }
    };
  }, []);

  return debouncedTracker;
};