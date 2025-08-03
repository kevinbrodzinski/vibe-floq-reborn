import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UnreadCount {
  thread_id: string;
  cnt: number;
}

export const useUnreadDMCounts = (selfId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dm-unread', selfId],
    enabled: !!selfId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('direct_threads')
        .select('id, member_a, member_b, unread_a, unread_b')
        .or(`member_a.eq.${selfId},member_b.eq.${selfId}`);
      
      if (error) throw error;
      
      return (data || [])
        .map(t => ({
          thread_id: t.id,
          cnt: t.member_a === selfId ? t.unread_a : t.unread_b
        }))
        .filter(r => r.cnt > 0);
    },
    staleTime: 30_000, // 30 seconds
  });

  // Setup realtime invalidation
  useEffect(() => {
    if (!selfId) return;

    if (import.meta.env.DEV) console.log('📱 Setting up DM unread counts realtime for user:', selfId);

    const channel = supabase
      .channel(`dm_unread_${selfId}`)
      // New DM - catch all and filter client-side
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: 'thread_id=neq.null'
      }, (payload) => {
        try {
          // Validate payload structure
          if (!payload || typeof payload !== 'object' || !payload.new) {
            console.warn('[useUnreadDMCounts] Invalid payload structure:', payload);
            return;
          }

          const msg = payload.new as { thread_id: string; sender_id: string };
          if (!msg || typeof msg !== 'object' || !msg.sender_id || !msg.thread_id) {
            console.warn('[useUnreadDMCounts] Invalid message structure:', msg);
            return;
          }

          if (msg.sender_id !== selfId) {
            if (import.meta.env.DEV) console.log('💬 New DM received, invalidating unread counts:', payload);
            queryClient.invalidateQueries({ queryKey: ['dm-unread', selfId] });
          }
        } catch (error) {
          console.error('[useUnreadDMCounts] Error processing DM insert:', error, payload);
        }
      })
      // Read status changes - separate listeners for each member column
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_threads',
        filter: `member_a=eq.${selfId}`
      }, (payload) => {
        try {
          if (import.meta.env.DEV) console.log('📖 Thread read status updated (member_a)');
          queryClient.invalidateQueries({ queryKey: ['dm-unread', selfId] });
        } catch (error) {
          console.error('[useUnreadDMCounts] Error processing thread update (member_a):', error, payload);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_threads',
        filter: `member_b=eq.${selfId}`
      }, (payload) => {
        try {
          if (import.meta.env.DEV) console.log('📖 Thread read status updated (member_b)');
          queryClient.invalidateQueries({ queryKey: ['dm-unread', selfId] });
        } catch (error) {
          console.error('[useUnreadDMCounts] Error processing thread update (member_b):', error, payload);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selfId, queryClient]);

  return query;
};