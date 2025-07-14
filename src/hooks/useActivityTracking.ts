import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

// Utility — local debounce factory to avoid timer scope leaks
function debounce<F extends (...args: any[]) => void>(fn: F, delay = 300): F {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: Parameters<F>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as F;
}

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

  // Create stable debounced function - only recreate when mutation.mutate or floqId changes
  return useMemo(() => {
    return debounce((section: 'chat' | 'activity' | 'plans' | 'all' = 'all') => {
      mutation.mutate(section);
    }, 300);
  }, [mutation.mutate, floqId]);
};