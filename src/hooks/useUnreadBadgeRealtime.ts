import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUnreadBadgeRealtime = (userId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`unread_realtime:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages'
      }, (payload) => {
        if (import.meta.env.DEV) console.log('🔔 New DM received, invalidating unread counts');
        queryClient.invalidateQueries({ queryKey: ['dm-unread', userId] });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_threads',
        filter: `or=(member_a.eq.${userId},member_b.eq.${userId})`
      }, (payload) => {
        if (import.meta.env.DEV) console.log('🔔 Thread updated, invalidating unread counts');
        queryClient.invalidateQueries({ queryKey: ['dm-unread', userId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
};

export const useTotalUnread = (userId?: string) => {
  const queryClient = useQueryClient();
  const unreadData = queryClient.getQueryData<Array<{ thread_id: string; cnt: number }>>(['dm-unread', userId]);
  return unreadData?.reduce((sum, item) => sum + item.cnt, 0) ?? 0;
};