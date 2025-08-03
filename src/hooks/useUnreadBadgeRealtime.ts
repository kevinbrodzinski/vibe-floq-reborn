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
        table: 'direct_messages',
        filter: 'thread_id=neq.null'
      }, (payload) => {
        try {
          // Validate payload structure
          if (!payload || typeof payload !== 'object' || !payload.new) {
            console.warn('[useUnreadBadgeRealtime] Invalid payload structure:', payload);
            return;
          }

          const msg = payload.new as { thread_id: string; sender_id: string };
          if (!msg || typeof msg !== 'object' || !msg.sender_id) {
            console.warn('[useUnreadBadgeRealtime] Invalid message structure:', msg);
            return;
          }

          if (msg.sender_id !== userId) {
            if (import.meta.env.DEV) console.log('🔔 New DM received, invalidating unread counts');
            queryClient.invalidateQueries({ queryKey: ['dm-unread', userId] });
          }
        } catch (error) {
          console.error('[useUnreadBadgeRealtime] Error processing DM insert:', error, payload);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_threads',
        filter: `member_a=eq.${userId}`
      }, (payload) => {
        try {
          if (import.meta.env.DEV) console.log('🔔 Thread updated (member_a)');
          queryClient.invalidateQueries({ queryKey: ['dm-unread', userId] });
        } catch (error) {
          console.error('[useUnreadBadgeRealtime] Error processing thread update (member_a):', error, payload);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_threads',
        filter: `member_b=eq.${userId}`
      }, (payload) => {
        try {
          if (import.meta.env.DEV) console.log('🔔 Thread updated (member_b)');
          queryClient.invalidateQueries({ queryKey: ['dm-unread', userId] });
        } catch (error) {
          console.error('[useUnreadBadgeRealtime] Error processing thread update (member_b):', error, payload);
        }
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