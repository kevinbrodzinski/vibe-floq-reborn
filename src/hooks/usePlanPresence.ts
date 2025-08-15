import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlanPresenceUser {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  joinedAt: string;
}

export function usePlanPresence(planId: string) {
  const [onlineUsers, setOnlineUsers] = useState<PlanPresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!planId) return;

    const channelName = `presence:plan:${planId}`;
    const presenceKey = crypto.randomUUID();
    
    const channel = supabase.channel(channelName, { 
      config: { 
        presence: { key: presenceKey } 
      } 
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: PlanPresenceUser[] = Object.values(state)
        .flat()
        .map((presence: any) => ({
          userId: presence.userId,
          displayName: presence.displayName,
          avatarUrl: presence.avatarUrl,
          joinedAt: presence.joinedAt
        }))
        .filter((user, index, self) => 
          // Deduplicate by userId
          index === self.findIndex(u => u.userId === user.userId)
        );
      
      setOnlineUsers(users);
    });

    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log(`User joined plan ${planId}:`, newPresences);
    });

    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log(`User left plan ${planId}:`, leftPresences);
    });

    const subscribeAndTrack = async () => {
      const status = await channel.subscribe();
      
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        
        // Get current user info
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Track current user's presence
          await channel.track({
            userId: user.id,
            displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Anonymous',
            avatarUrl: user.user_metadata?.avatar_url,
            joinedAt: new Date().toISOString()
          });
        }
      } else {
        setIsConnected(false);
      }
    };

    subscribeAndTrack();

    return () => {
      setIsConnected(false);
      setOnlineUsers([]);
      supabase.removeChannel(channel);
    };
  }, [planId]);

  return {
    onlineUsers,
    isConnected,
    totalOnline: onlineUsers.length
  };
}