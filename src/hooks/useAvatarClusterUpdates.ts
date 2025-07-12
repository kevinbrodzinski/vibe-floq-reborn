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

    // Subscribe to floq_participants changes - optimized to avoid heartbeat spam
    const channel = supabase
      .channel('floq-participants-optimized')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen to new joins, not heartbeat updates
          schema: 'public',
          table: 'floq_participants'
        },
        (payload) => {
          console.log('👥 New floq participant joined:', payload);
          
          const floqId = payload.new?.floq_id;
          
          if (floqId) {
            // Debounced invalidation to batch multiple rapid changes
            setTimeout(() => {
              queryClient.invalidateQueries({ 
                queryKey: ['active-floqs'],
                exact: false 
              });
              
              queryClient.invalidateQueries({ 
                queryKey: ['floq-details', floqId],
                exact: false 
              });
            }, 100);

            console.log('✨ Debounced invalidation for participant join');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE', // Also listen to leaves
          schema: 'public',
          table: 'floq_participants'
        },
        (payload) => {
          console.log('👥 Floq participant left:', payload);
          
          const floqId = payload.old?.floq_id;
          
          if (floqId) {
            setTimeout(() => {
              queryClient.invalidateQueries({ 
                queryKey: ['active-floqs'],
                exact: false 
              });
              
              queryClient.invalidateQueries({ 
                queryKey: ['floq-details', floqId],
                exact: false 
              });
            }, 100);

            console.log('✨ Debounced invalidation for participant leave');
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