
import { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getEnvironmentConfig } from '@/lib/environment';

interface PresenceUser {
  user_id: string;
  lat: number;
  lng: number;
  vibe: string;
  last_seen: string;
  isFriend?: boolean;
}

export const useBucketedPresence = (lat?: number, lng?: number, friendIds: string[] = []) => {
  const [people, setPeople] = useState<PresenceUser[]>([]);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  const env = getEnvironmentConfig();
  
  // Disable WebSocket connections in production/preview environments
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  const enableWebSockets = isLocalhost && env.enablePresenceUpdates;
  
  if (env.debugPresence) {
    console.log('🔴 useBucketedPresence - WebSocket connections disabled in production');
  }

  useEffect(() => {
    if (!lat || !lng || !enableWebSockets) {
      // Return mock data when WebSockets are disabled
      const mockPeople: PresenceUser[] = [
        {
          user_id: 'mock-user-1',
          lat: lat || 34.05,
          lng: lng || -118.24,
          vibe: 'social',
          last_seen: new Date().toISOString(),
          isFriend: false
        }
      ];
      setPeople(mockPeople);
      setLastHeartbeat(Date.now());
      return;
    }

    // Only attempt WebSocket connections on localhost
    try {
      const channel = supabase.channel(`presence-${Math.round(lat * 100)}-${Math.round(lng * 100)}`);
      
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            users.push({
              ...presence,
              isFriend: friendIds.includes(presence.user_id)
            });
          });
        });
        
        setPeople(users);
        setLastHeartbeat(Date.now());
      });

      channel.subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.warn('Failed to setup presence channel:', error);
      // Fallback to mock data
      setPeople([]);
      setLastHeartbeat(Date.now());
    }
  }, [lat, lng, friendIds.join(','), enableWebSockets]);

  return { people, lastHeartbeat };
};
