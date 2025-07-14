import { useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

// Debug logger that works in dev but stays quiet in tests and production
const debug = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production' && !process.env.VITEST && !process.env.NODE_ENV?.includes('test')) {
    console.log(...args);
  }
};

/**
 * Real-time subscription hook that invalidates unread count queries 
 * when new content arrives in user's joined floqs.
 */
export const useRealtimeUnreadUpdates = (joinedFloqIds: string[] = []) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const channelRef = useRef<any>(null);

  // Memoize sorted IDs to prevent unnecessary re-subscriptions
  const sortedKey = useMemo(
    () => (joinedFloqIds.length ? [...joinedFloqIds].sort().join(',') : ''),
    [joinedFloqIds.length, joinedFloqIds.join('|')]
  );

  useEffect(() => {
    if (!user || !sortedKey) return;

    debug('Setting up real-time unread updates for floqs:', joinedFloqIds);

    // Helper function to invalidate unread queries with correct keys
    function invalidateUnreadQueries(floqId: string) {
      if (!user?.id) return;
      // Invalidate specific floq counts with userId
      queryClient.invalidateQueries({ queryKey: ['unread-counts', floqId, user.id] });
      // Invalidate aggregated counts with userId
      queryClient.invalidateQueries({ queryKey: ['my-floqs-unread', user.id] });
    }

    // Format UUIDs for Postgres filter (bare UUIDs without quotes work fine)
    const sortedFloqIds = [...joinedFloqIds].sort();
    const quotedIds = sortedFloqIds.map(id => `${id}`).join(',');

    // Clean up existing channel before creating new one to prevent memory leaks
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create a single channel for all real-time updates and store ref for cleanup
    const channel = channelRef.current = supabase
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
          debug('New message detected:', payload);
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
          debug('New activity detected:', payload);
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
          debug('New plan detected:', payload);
          // Only invalidate if plan is from someone else
          if (payload.new?.creator_id !== user.id) {
            invalidateUnreadQueries(payload.new?.floq_id);
          }
        }
      )
      .subscribe();

    return () => {
      debug('Cleaning up real-time unread subscriptions');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, sortedKey, queryClient]);

  // Cleanup individual channel when user changes (logout/login scenarios)
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);
};