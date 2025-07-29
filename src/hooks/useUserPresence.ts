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
    if (!session?.user?.id) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⏳ useUserPresence waiting for session');
      }
      return;
    }

    try {
      // Subscribe to presence updates with modern API
      const channel = supabase
        .channel('user_presence')
        .on('presence', { event: 'sync' }, () => {
          try {
            const state = channel.presenceState?.() || {};
            const presenceMap = new Map<string, UserPresence>();
            
            Object.entries(state).forEach(([profileId, presences]) => {
              const presence = presences[0] as any;
              if (presence?.user_id) {
                presenceMap.set(profileId, presence as UserPresence);
              }
            });
            
            setUserPresence(presenceMap);
          } catch (syncError) {
            console.warn('Failed to sync user presence:', syncError);
          }
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          try {
            setUserPresence(prev => {
              const updated = new Map(prev);
              newPresences.forEach((presence: any) => {
                if (presence?.user_id) {
                  updated.set(key, presence as UserPresence);
                }
              });
              return updated;
            });
          } catch (joinError) {
            console.warn('Failed to handle presence join:', joinError);
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          try {
            setUserPresence(prev => {
              const updated = new Map(prev);
              const presence = updated.get(key);
              if (presence) {
                updated.set(key, { ...presence, status: 'offline' });
              }
              return updated;
            });
          } catch (leaveError) {
            console.warn('Failed to handle presence leave:', leaveError);
          }
        })
        .subscribe(async (status) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('📡 User presence channel status:', status);
          }
          
          if (status === 'SUBSCRIBED') {
            try {
              // Track our own presence
              await channel.track({
                profile_id: session.user.id,
                status: 'online',
                last_seen: new Date().toISOString(),
              });
            } catch (trackError) {
              console.warn('Failed to track user presence:', trackError);
            }
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('User presence channel connection failed');
          }
        });

      return () => {
        try {
          // Untrack presence before removing channel
          channel.untrack?.();
          supabase.removeChannel(channel);
        } catch (cleanupError) {
          console.warn('Failed to cleanup user presence channel:', cleanupError);
        }
      };
    } catch (channelError) {
      console.error('Failed to create user presence channel:', channelError);
    }
  }, [session?.user?.id]);

  const getUserPresence = (profileId: string): UserPresence | null => {
    return userPresence.get(profileId) || null;
  };

  const isUserOnline = (profileId: string): boolean => {
    const presence = getUserPresence(profileId);
    return presence?.status === 'online';
  };

  return {
    userPresence,
    getUserPresence,
    isUserOnline,
  };
}