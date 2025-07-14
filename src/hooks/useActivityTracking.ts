import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useCallback, useRef } from "react";

type ActivitySection = 'chat' | 'activity' | 'plans' | 'all';

interface ActivityTrackingParams {
  floqId: string;
  section: ActivitySection;
}

export const useActivityTracking = () => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const debounceRef = useRef<Record<string, NodeJS.Timeout>>({});

  const mutation = useMutation({
    mutationFn: async ({ floqId, section }: ActivityTrackingParams) => {
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase.rpc('update_user_activity_tracking', {
        p_floq_id: floqId,
        p_section: section
      });

      if (error) {
        console.error('Activity tracking error:', error);
        throw error;
      }

      return { floqId, section };
    },
    onSuccess: ({ floqId }) => {
      // Invalidate unread counts for this floq
      queryClient.invalidateQueries({ 
        queryKey: ['unread-counts', floqId, session?.user?.id] 
      });
      
      // Also invalidate global counts
      queryClient.invalidateQueries({ 
        queryKey: ['my-floqs-unread', session?.user?.id] 
      });
    },
    onError: (error) => {
      console.error('Failed to track activity:', error);
    }
  });

  const trackActivity = useCallback((floqId: string, section: ActivitySection) => {
    if (!session?.user?.id || !floqId) return;

    const debounceKey = `${floqId}-${section}`;
    
    // Clear existing debounce for this key
    if (debounceRef.current[debounceKey]) {
      clearTimeout(debounceRef.current[debounceKey]);
    }

    // Debounce for 300ms to prevent spam
    debounceRef.current[debounceKey] = setTimeout(() => {
      mutation.mutate({ floqId, section });
      delete debounceRef.current[debounceKey];
    }, 300);
  }, [session?.user?.id, mutation]);

  return {
    trackActivity,
    isTracking: mutation.isPending,
    error: mutation.error
  };
};