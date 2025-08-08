import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createSafeRealtimeHandler } from '@/lib/realtime/validation';

export const useUnreadBadgeRealtime = (profileId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profileId) return;

    let mounted = true;
    const channel = supabase
      .channel(`unread_realtime:${profileId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: 'thread_id=neq.null'
      }, createSafeRealtimeHandler<{ thread_id: string; sender_id: string }>(
        ({ new: msg }) => {
          if (!mounted || !msg || !msg.sender_id) return;
          
          if (msg.sender_id !== profileId) {
            if (import.meta.env.DEV) console.log('🔔 New DM received, invalidating unread counts');
            queryClient.invalidateQueries({ queryKey: ['dm-unread', profileId] });
          }
        },
        (error, payload) => {
          if (mounted) {
            console.error('[useUnreadBadgeRealtime] Realtime error:', error, payload);
          }
        }
      ))
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_threads',
        filter: `member_a_profile_id.eq.${profileId}`
      }, createSafeRealtimeHandler<{}>(
        () => {
          if (!mounted) return;
          if (import.meta.env.DEV) console.log('🔔 Thread updated (member_a)');
          queryClient.invalidateQueries({ queryKey: ['dm-unread', profileId] });
        },
        (error, payload) => {
          if (mounted) {
            console.error('[useUnreadBadgeRealtime] Thread update error (member_a):', error, payload);
          }
        }
      ))
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_threads',
        filter: `member_b_profile_id.eq.${profileId}`
      }, createSafeRealtimeHandler<{}>(
        () => {
          if (!mounted) return;
          if (import.meta.env.DEV) console.log('🔔 Thread updated (member_b)');
          queryClient.invalidateQueries({ queryKey: ['dm-unread', profileId] });
        },
        (error, payload) => {
          if (mounted) {
            console.error('[useUnreadBadgeRealtime] Thread update error (member_b):', error, payload);
          }
        }
      ))
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel)
        .catch(err => console.error('[useUnreadBadgeRealtime] Channel cleanup error:', err));
    };
  }, [profileId, queryClient]);
};

export const useTotalUnread = (profileId?: string) => {
  const queryClient = useQueryClient();
  const unreadData = queryClient.getQueryData<Array<{ thread_id: string; cnt: number }>>(['dm-unread', profileId]);
  return unreadData?.reduce((sum, item) => sum + item.cnt, 0) ?? 0;
};