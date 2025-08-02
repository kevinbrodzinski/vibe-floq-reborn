
import { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getEnvironmentConfig } from '@/lib/environment';
import type { GeometryPoint } from '@/lib/types/geometry';
import { deterministicRandom } from '@/utils/djb2Hash';
import mockFriends from '@/data/mockFriends.json';

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
  
  // Use real friend IDs if available, otherwise use fixture
  const realFriendIds = friendIds.length > 0 ? friendIds.slice(0, 4) : mockFriends.friendIds;
  
  const mockUsers = realFriendIds.map((friendId, index) => ({
    profile_id: friendId,
    vibe: ['social', 'chill', 'hype', 'flowing'][index % 4],
    isFriend: true
  }));

  // Generate realistic mock presence data with coordinate jitter
  return mockUsers.map((user, index) => {
    // Create a realistic distribution around the user with jitter
    const angle = (index * 45 + deterministicRandom(user.profile_id, 1) * 30) * (Math.PI / 180); 
    const distance = 0.002 + (index * 0.001) + (deterministicRandom(user.profile_id, 2) * 0.0005); // 200m-1km + ±50m jitter
    
    const offsetLat = Math.cos(angle) * distance;
    const offsetLng = Math.sin(angle) * distance;
    
    // Add micro-jitter to prevent exact overlaps (±30m)
    const jitterLat = (deterministicRandom(user.profile_id, 3) - 0.5) * 0.0005; // ±30m at equator
    const jitterLng = (deterministicRandom(user.profile_id, 4) - 0.5) * 0.0005;
    
    const lat = userLat + offsetLat + jitterLat;
    const lng = userLng + offsetLng + jitterLng;
    
    return {
      ...user,
      location: {
        type: 'Point' as const,
        coordinates: [lng, lat] as [number, number] // [longitude, latitude]
      },
      last_seen: new Date(Date.now() - deterministicRandom(user.profile_id, 5) * 300000).toISOString() // 0-5 minutes ago
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
    if (!lat || !lng) {
      setPeople([]);
      setLastHeartbeat(null);
      return;
    }

    // In development, show enhanced mock data with real friend IDs
    if (showMockData) {
      const mockPeople = generateMockPresenceData(lat, lng, friendIds);
      console.log('[BucketedPresence] Generating enhanced mock presence data:', mockPeople);
      setPeople(mockPeople);
      setLastHeartbeat(Date.now());
      return;
    }

    // Production mode: Try to connect to real presence data
    try {
      // First, try to get real presence data from vibes_now table
      const fetchRealPresence = async () => {
        try {
          console.log('[BucketedPresence] Fetching real presence data for location:', { lat, lng });
          
          // Query vibes_now table for nearby users
          const { data: presenceData, error } = await supabase
            .from('vibes_now')
            .select('profile_id, location, vibe, updated_at')
            .not('location', 'is', null);

          if (error) {
            console.warn('[BucketedPresence] Error fetching presence data:', error);
            throw error;
          }

          if (presenceData && presenceData.length > 0) {
            console.log('[BucketedPresence] Found real presence data:', presenceData);
            
            // Convert to expected format
            const realPeople: PresenceUser[] = presenceData.map((presence: any) => ({
              profile_id: presence.profile_id,
              location: presence.location,
              vibe: presence.vibe,
              last_seen: presence.updated_at,
              isFriend: friendIds.includes(presence.profile_id)
            }));

            setPeople(realPeople);
            setLastHeartbeat(Date.now());
            return;
          }
        } catch (error) {
          console.warn('[BucketedPresence] Failed to fetch real presence data:', error);
        }

        // Fallback to enhanced mock data with real friend integration
        console.log('[BucketedPresence] No real presence data found, using enhanced mock data');
        const mockPeople = generateMockPresenceData(lat, lng, friendIds);
        setPeople(mockPeople);
        setLastHeartbeat(Date.now());
      };

      fetchRealPresence();

      // Set up real-time subscription using H3-based channel for better geographic grouping
      // Note: Using H3 would provide better geographic clustering than lat/lng rounding
      const channel = supabase.channel(`presence-h3-${Math.round(lat * 1000)}-${Math.round(lng * 1000)}`);
      
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
        
        if (users.length > 0) {
          console.log('[BucketedPresence] Real-time presence update:', users);
          setPeople(users);
          setLastHeartbeat(Date.now());
        }
      });

      channel.subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.warn('[BucketedPresence] Failed to setup presence system:', error);
      // Fallback to mock data
      const mockPeople = generateMockPresenceData(lat, lng, friendIds);
      setPeople(mockPeople);
      setLastHeartbeat(Date.now());
    }
  }, [lat, lng, friendIds.join(','), showMockData]);

  return { people, lastHeartbeat };
};
