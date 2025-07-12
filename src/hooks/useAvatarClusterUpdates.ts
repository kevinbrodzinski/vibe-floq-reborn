import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for real-time avatar cluster updates
 * Subscribes to floq_participants changes and updates the UI
 */
export const useAvatarClusterUpdates = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('🔗 Setting up avatar cluster updates subscription');

    // Subscribe to floq_participants changes
    const channel = supabase
      .channel('floq-participants-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'floq_participants'
        },
        (payload) => {
          console.log('👥 Floq participants change:', payload);
          
          // Extract floq_id from the payload
          const floqId = payload.new?.floq_id || payload.old?.floq_id;
          
          if (floqId) {
            // Invalidate active floqs query to refresh participant counts and avatars
            queryClient.invalidateQueries({ 
              queryKey: ['active-floqs'],
              exact: false 
            });
            
            // Also invalidate specific floq data if we have more granular queries
            queryClient.invalidateQueries({ 
              queryKey: ['floq-details', floqId],
              exact: false 
            });

            console.log('✨ Invalidated floq data for real-time avatar updates');
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      console.log('🔌 Cleaning up avatar cluster updates subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    // This hook doesn't return data, it just manages subscriptions
    // The UI components will automatically re-render when queries are invalidated
  };
};