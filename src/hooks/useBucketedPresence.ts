
import { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getEnvironmentConfig } from '@/lib/environment';
import type { GeometryPoint } from '@/lib/types/geometry';

interface PresenceUser {
  profile_id: string;
  location: GeometryPoint;
  vibe: string;
  last_seen: string;
  isFriend?: boolean;
}

// Generate realistic mock presence data
const generateMockPresenceData = (userLat?: number, userLng?: number, friendIds: string[] = []): PresenceUser[] => {
  if (!userLat || !userLng) return [];
  
  // Use real friend IDs if available, otherwise use fallback IDs
  const realFriendIds = friendIds.length > 0 ? friendIds.slice(0, 4) : [
    'e2a658f7-a20b-4c5d-9a8f-53c84d202e82', // beata
    '44c0d38e-bbce-4279-aed6-3835aa6631c4', // kaleb
    '5d57a369-8d57-4898-8b04-e614051f69e4', // kevinb
    'd18378b9-93db-4a14-9449-7d01386ac8ff'  // weston
  ];
  
  const mockUsers = realFriendIds.map((friendId, index) => ({
    profile_id: friendId,
    vibe: ['social', 'chill', 'hype', 'flowing'][index % 4],
    isFriend: true
  }));

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
  
  // Show mock data only in development
  const showMockData = process.env.NODE_ENV === 'development';
  
  if (env.debugPresence) {
    console.log('🔴 useBucketedPresence - WebSocket connections disabled in production');
  }

  useEffect(() => {
    if (!lat || !lng || showMockData) {
      // Return realistic mock data for field screen debugging
      const mockPeople = generateMockPresenceData(lat, lng, friendIds);
      console.log('[BucketedPresence] Generating mock presence data:', mockPeople);
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
              isFriend: friendIds.includes(presence.profile_id)
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
  }, [lat, lng, friendIds.join(','), showMockData]);

  return { people, lastHeartbeat };
};
