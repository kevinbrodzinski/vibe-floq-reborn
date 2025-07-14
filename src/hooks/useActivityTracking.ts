import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Utility — local debounce so we don't pull an external dep just for this
function debounce<F extends (...args: any[]) => void>(fn: F, delay = 300) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<F>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
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

  const mutation = useMutation({
    mutationFn: async (section: 'chat' | 'activity' | 'plans' | 'all') => {
      const { error } = await supabase.rpc('update_user_activity_tracking', {
        p_floq_id: floqId,
        p_section: section,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      // Refresh badge data for this floq + global aggregates
      queryClient.invalidateQueries({ queryKey: ['unread-counts', floqId] });
      queryClient.invalidateQueries({ queryKey: ['my-floqs-unread'] });
      queryClient.invalidateQueries({ queryKey: ['global-unread'] });
    },
  });

  // Debounced wrapper so callers can freely fire on every route change
  return useCallback(
    debounce((section: 'chat' | 'activity' | 'plans' | 'all' = 'all') => {
      mutation.mutate(section);
    }),
    [mutation]
  );
};