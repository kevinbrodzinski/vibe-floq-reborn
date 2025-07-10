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

  // Listen for read status changes to invalidate cache
  useEffect(() => {
    if (!selfId) return;

    const channel = supabase
      .channel('dm_read_notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'direct_messages'
      }, () => {
        // Invalidate on any message changes
        queryClient.invalidateQueries({ queryKey: ['dm-unread', selfId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selfId, queryClient]);

  return query;
};