import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createSafeRealtimeHandler } from '@/lib/realtime/validation';

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

    let mounted = true;
    if (import.meta.env.DEV) console.log('📱 Setting up DM unread counts realtime for user:', selfId);

    const channel = supabase
      .channel(`dm_unread_${selfId}`)
      // New DM - catch all and filter client-side
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: 'thread_id=neq.null'
      }, createSafeRealtimeHandler<{ thread_id: string; sender_id: string }>(
        ({ new: msg }) => {
          if (!mounted || !msg || !msg.sender_id || !msg.thread_id) return;
          
          if (msg.sender_id !== selfId) {
            if (import.meta.env.DEV) console.log('💬 New DM received, invalidating unread counts');
            queryClient.invalidateQueries({ queryKey: ['dm-unread', selfId] });
          }
        },
        (error, payload) => {
          if (mounted) {
            console.error('[useUnreadDMCounts] Realtime error:', error, payload);
          }
        }
      ))
      // Read status changes - separate listeners for each member column
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_threads',
        filter: `member_a=eq.${selfId}`
      }, createSafeRealtimeHandler<{}>(
        () => {
          if (!mounted) return;
          if (import.meta.env.DEV) console.log('📖 Thread read status updated (member_a)');
          queryClient.invalidateQueries({ queryKey: ['dm-unread', selfId] });
        },
        (error, payload) => {
          if (mounted) {
            console.error('[useUnreadDMCounts] Thread update error (member_a):', error, payload);
          }
        }
      ))
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_threads',
        filter: `member_b=eq.${selfId}`
      }, createSafeRealtimeHandler<{}>(
        () => {
          if (!mounted) return;
          if (import.meta.env.DEV) console.log('📖 Thread read status updated (member_b)');
          queryClient.invalidateQueries({ queryKey: ['dm-unread', selfId] });
        },
        (error, payload) => {
          if (mounted) {
            console.error('[useUnreadDMCounts] Thread update error (member_b):', error, payload);
          }
        }
      ))
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel)
        .catch(err => console.error('[useUnreadDMCounts] Channel cleanup error:', err));
    };
  }, [selfId, queryClient]);

  return query;
};