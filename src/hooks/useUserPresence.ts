import { useEffect, useState } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';

interface UserPresence {
  user_id: string;
  status: 'online' | 'offline' | 'away';
  last_seen: string;
}

export function useUserPresence() {
  const session = useSession();
  const [userPresence, setUserPresence] = useState<Map<string, UserPresence>>(new Map());

  useEffect(() => {
    if (!session?.user?.id) return;

    // Subscribe to presence updates with modern API
    const channel = supabase
      .channel('user_presence')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState?.() || {};
        const presenceMap = new Map<string, UserPresence>();
        
        Object.entries(state).forEach(([userId, presences]) => {
          const presence = presences[0] as any;
          if (presence?.user_id) {
            presenceMap.set(userId, presence as UserPresence);
          }
        });
        
        setUserPresence(presenceMap);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setUserPresence(prev => {
          const updated = new Map(prev);
          newPresences.forEach((presence: any) => {
            if (presence?.user_id) {
              updated.set(key, presence as UserPresence);
            }
          });
          return updated;
        });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setUserPresence(prev => {
          const updated = new Map(prev);
          const presence = updated.get(key);
          if (presence) {
            updated.set(key, { ...presence, status: 'offline' });
          }
          return updated;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track our own presence
          await channel.track({
            user_id: session.user.id,
            status: 'online',
            last_seen: new Date().toISOString(),
          });
        }
      });

    return () => {
      // Untrack presence before removing channel
      channel.untrack?.();
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const getUserPresence = (userId: string): UserPresence | null => {
    return userPresence.get(userId) || null;
  };

  const isUserOnline = (userId: string): boolean => {
    const presence = getUserPresence(userId);
    return presence?.status === 'online';
  };

  return {
    userPresence,
    getUserPresence,
    isUserOnline,
  };
}