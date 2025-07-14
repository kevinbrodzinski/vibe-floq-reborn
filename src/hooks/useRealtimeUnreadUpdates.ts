import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Real-time subscription hook that invalidates unread count queries 
 * when new content arrives in user's joined floqs.
 */
export const useRealtimeUnreadUpdates = (joinedFloqIds: string[] = []) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || joinedFloqIds.length === 0) return;

    console.log('Setting up real-time unread updates for floqs:', joinedFloqIds);

    // Helper function to invalidate unread queries with correct keys
    function invalidateUnreadQueries(floqId: string) {
      // Invalidate specific floq counts with userId
      queryClient.invalidateQueries({ queryKey: ['unread-counts', floqId, user.id] });
      // Invalidate aggregated counts with userId
      queryClient.invalidateQueries({ queryKey: ['my-floqs-unread', user.id] });
      queryClient.invalidateQueries({ queryKey: ['global-unread'] });
    }

    // Format UUIDs with quotes for Postgres filter
    const quotedIds = joinedFloqIds.map(id => `"${id}"`).join(',');

    // Create a single channel for all real-time updates
    const channel = supabase
      .channel(`unread-updates-${user.id}`)
      // Listen for new messages in user's floqs
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'floq_messages',
          filter: `floq_id=in.(${quotedIds})`
        },
        (payload) => {
          console.log('New message detected:', payload);
          // Only invalidate if message is from someone else
          if (payload.new?.sender_id !== user.id) {
            invalidateUnreadQueries(payload.new?.floq_id);
          }
        }
      )
      // Listen for new activity events
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'flock_history',
          filter: `floq_id=in.(${quotedIds})`
        },
        (payload) => {
          console.log('New activity detected:', payload);
          // Only invalidate if event is from someone else
          if (payload.new?.user_id !== user.id) {
            invalidateUnreadQueries(payload.new?.floq_id);
          }
        }
      )
      // Listen for new plans
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'floq_plans',
          filter: `floq_id=in.(${quotedIds})`
        },
        (payload) => {
          console.log('New plan detected:', payload);
          // Only invalidate if plan is from someone else
          if (payload.new?.creator_id !== user.id) {
            invalidateUnreadQueries(payload.new?.floq_id);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time unread subscriptions');
      supabase.removeChannel(channel);
    };
  }, [user?.id, joinedFloqIds.join(','), queryClient]);
};