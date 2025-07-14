import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UnreadCount {
  thread_id: string;
  friend_id: string;
  unread_count: number;
}

export const useUnreadDMCounts = (selfId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dm-unread', selfId],
    enabled: !!selfId,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_unread_counts', { user_id_param: selfId });
      if (error) throw error;
      return data as UnreadCount[];
    },
    staleTime: 30_000, // 30 seconds
  });

  // Listen only for threads that involve this user to reduce noise
  useEffect(() => {
    if (!selfId) return;

    console.log('📱 Setting up DM unread counts realtime for user:', selfId);

    const channel = supabase
      .channel(`unread_updates:${selfId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `thread_id=in.(SELECT id FROM direct_threads WHERE member_a=eq.${selfId} OR member_b=eq.${selfId})`
      }, (payload) => {
        console.log('💬 New DM received, invalidating unread counts:', payload);
        // Only invalidate when new messages arrive for threads involving this user
        queryClient.invalidateQueries({ queryKey: ['dm-unread', selfId] });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_threads',
        filter: `member_a=eq.${selfId} OR member_b=eq.${selfId}`
      }, (payload) => {
        console.log('📖 Thread read status updated, invalidating unread counts:', payload);
        // Invalidate when read timestamps are updated - fixed OR condition
        queryClient.invalidateQueries({ queryKey: ['dm-unread', selfId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selfId, queryClient]);

  return query;
};