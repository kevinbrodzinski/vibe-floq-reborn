import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OnlineStatus {
  isOnline: boolean;
  lastSeen: string | null;
}

/**
 * Realtime hook for **any** user's connectivity row.
 */
export function useUserOnlineStatus(profileId?: string): OnlineStatus | null {
  const [status, setStatus] = useState<OnlineStatus | null>(null);

  useEffect(() => {
    if (!profileId) {
      setStatus(null);
      return;
    }

    // 1. Initial fetch
    const fetchInitialStatus = async () => {
      try {
        const { data } = await supabase
          .from('user_online_status')
          .select('is_online,last_seen')
          .eq('profile_id', profileId)
          .maybeSingle();
        
        setStatus(
          data
            ? { isOnline: (data as any).is_online, lastSeen: (data as any).last_seen }
            : { isOnline: false, lastSeen: null }
        );
      } catch (error) {
        console.warn('Failed to fetch online status:', error);
        setStatus({ isOnline: false, lastSeen: null });
      }
    };

    fetchInitialStatus();

    // 2. Realtime subscription
    const channel = supabase
      .channel(`online-status:${profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_online_status',
          filter: `profile_id=eq.${profileId}`
        },
        (payload) => {
          if (payload.new) {
            const row = payload.new as { is_online: boolean; last_seen: string };
            setStatus({ isOnline: row.is_online, lastSeen: row.last_seen });
          } else if (payload.eventType === 'DELETE') {
            setStatus({ isOnline: false, lastSeen: null });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  return status;
}