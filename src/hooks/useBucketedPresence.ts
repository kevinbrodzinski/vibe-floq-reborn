
import { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getEnvironmentConfig } from '@/lib/environment';
import type { GeometryPoint } from '@/lib/types/geometry';

interface PresenceUser {
  user_id: string;
  location: GeometryPoint;
  vibe: string;
  last_seen: string;
  isFriend?: boolean;
}

// Generate realistic mock presence data
const generateMockPresenceData = (userLat?: number, userLng?: number, friendIds: string[] = []): PresenceUser[] => {
  if (!userLat || !userLng) return [];
  
  const mockUsers = [
    {
      profile_id: 'mock-user-1',
      vibe: 'social',
      isFriend: friendIds.includes('mock-user-1')
    },
    {
      profile_id: 'mock-user-2', 
      vibe: 'chill',
      isFriend: friendIds.includes('mock-user-2')
    },
    {
      profile_id: 'mock-user-3',
      vibe: 'hype',
      isFriend: friendIds.includes('mock-user-3')
    },
    {
      profile_id: 'mock-user-4',
      vibe: 'flowing',
      isFriend: friendIds.includes('mock-user-4')
    },
    {
      profile_id: 'mock-user-5',
      vibe: 'social',
      isFriend: friendIds.includes('mock-user-5')
    },
    {
      profile_id: 'mock-user-6',
      vibe: 'chill',
      isFriend: friendIds.includes('mock-user-6')
    },
    {
      profile_id: 'mock-user-7',
      vibe: 'hype',
      isFriend: friendIds.includes('mock-user-7')
    },
    {
      profile_id: 'mock-user-8',
      vibe: 'flowing',
      isFriend: friendIds.includes('mock-user-8')
    }
  ];

  // Generate realistic positions around the user (within ~1km radius)
  return mockUsers.map((user, index) => {
    // Create a realistic distribution around the user
    const angle = (index * 45) * (Math.PI / 180); // Spread users in a circle
    const distance = 0.002 + (index * 0.001); // 200m to 1km away
    
    const offsetLat = Math.cos(angle) * distance;
    const offsetLng = Math.sin(angle) * distance;
    
    const lat = userLat + offsetLat;
    const lng = userLng + offsetLng;
    
    return {
      ...user,
      location: {
        type: 'Point' as const,
        coordinates: [lng, lat] as [number, number] // [longitude, latitude]
      },
      last_seen: new Date(Date.now() - Math.random() * 300000).toISOString() // Random time within last 5 minutes
    };
  });
};

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
      // Return realistic mock data when WebSockets are disabled
      const mockPeople = generateMockPresenceData(lat, lng, friendIds);
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
      const mockPeople = generateMockPresenceData(lat, lng, friendIds);
      setPeople(mockPeople);
      setLastHeartbeat(Date.now());
    }
  }, [lat, lng, friendIds.join(','), enableWebSockets]);

  return { people, lastHeartbeat };
};
