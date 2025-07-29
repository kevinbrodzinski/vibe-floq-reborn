import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UnreadCount {
  kind: string;
  cnt: number;
  // Additional fields that might be returned by the RPC
  thread_id?: string;
  friend_id?: string;
  unread_count?: number;
}

export const useUnreadDMCounts = (selfId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dm-unread', selfId],
    enabled: !!selfId,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_unread_counts', { p_profile: selfId });
      if (error) throw error;
      return data as UnreadCount[];
    },
    staleTime: 30_000, // 30 seconds
  });

  // Listen only for threads that involve this user to reduce noise
  useEffect(() => {
    if (!selfId) return;

    if (import.meta.env.DEV) console.log('📱 Setting up DM unread counts realtime for user:', selfId);

    const channel = supabase
      .channel(`unread_updates:${selfId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages'
      }, (payload) => {
        if (import.meta.env.DEV) console.log('💬 New DM received, invalidating unread counts:', payload);
        // Invalidate for any new message - will be filtered by RPC function
        queryClient.invalidateQueries({ queryKey: ['dm-unread', selfId] });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_threads',
        filter: `or=(member_a.eq.${selfId},member_b.eq.${selfId})`
      }, (payload) => {
        if (import.meta.env.DEV) console.log('📖 Thread read status updated, invalidating unread counts:', payload);
        // Invalidate when read timestamps are updated - fixed OR syntax
        queryClient.invalidateQueries({ queryKey: ['dm-unread', selfId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selfId, queryClient]);

  return query;
};