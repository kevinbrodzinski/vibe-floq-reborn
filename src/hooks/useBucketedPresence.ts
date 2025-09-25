import { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getEnvironmentConfig } from '@/lib/environment';
import type { GeometryPoint } from '@/lib/types/geometry';
import { deterministicRandom } from '@/lib/geo/random';
import { latLngToCell as geoToH3 } from 'h3-js'; // Use consistent naming
import { VIBES } from '@/lib/vibes';
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
    vibe: VIBES[index % VIBES.length],
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
  const lastTrackRef = useRef<number>(0);
  const channelRef = useRef<any>(null); // Shared ref for presence tracking
  const env = getEnvironmentConfig();
  
  // Show mock data only when explicitly enabled (allows testing real data in dev)
  const showMockData = process.env.NODE_ENV === 'development' && 
                      process.env.VITE_USE_MOCK_PRESENCE === 'true';
  
  if (env.debugPresence) {
    console.log('🔴 useBucketedPresence - WebSocket connections disabled in production');
  }

  useEffect(() => {
    if (!lat || !lng) {
      setPeople([]);
      setLastHeartbeat(null);
      return;
    }

    // Only use mock data if explicitly enabled
    if (showMockData) {
      const mockPeople = generateMockPresenceData(lat, lng, friendIds);
      console.log('[BucketedPresence] Using mock presence data (VITE_USE_MOCK_PRESENCE=true):', mockPeople);
      setPeople(mockPeople);
      setLastHeartbeat(Date.now());
      return;
    }

    console.log('[BucketedPresence] Attempting to fetch real presence data...');

    // Production mode: Try to connect to real presence data
    const setupPresence = async () => {
      try {
        // Use H3 for precise channel addressing at resolution 7 (~1.2km hexagons)
        const h3Index = geoToH3(lat, lng, 7);
        const channel = supabase.channel(`presence-${h3Index}`);
        
        let hasSocketData = false;
        
        // Enhanced WebSocket subscription with minimal payload
        channel.on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const users: PresenceUser[] = [];
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[BucketedPresence] WebSocket sync event, users:', Object.keys(state).length);
          }
          
          Object.values(state).forEach((presences: any) => {
            presences.forEach((presence: any) => {
              // Only include essential fields to reduce payload
              users.push({
                profile_id: presence.profile_id,
                location: presence.location,
                vibe: presence.vibe,
                last_seen: presence.last_seen || new Date().toISOString(),
                isFriend: friendIds.includes(presence.profile_id)
              });
            });
          });
          
          if (users.length > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[BucketedPresence] Real-time presence update:', users.length, 'users');
            }
            setPeople(users);
            setLastHeartbeat(Date.now());
            hasSocketData = true;
          }
        });

        // Listen for individual presence changes with optimized updates
        channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[BucketedPresence] User joined:', key);
          }
          // Efficiently update state without full rebuild
          const state = channel.presenceState();
          const users: PresenceUser[] = [];
          Object.values(state).forEach((presences: any) => {
            presences.forEach((presence: any) => {
              users.push({
                profile_id: presence.profile_id,
                location: presence.location,
                vibe: presence.vibe,
                last_seen: presence.last_seen || new Date().toISOString(),
                isFriend: friendIds.includes(presence.profile_id)
              });
            });
          });
          setPeople(users);
          setLastHeartbeat(Date.now());
        });

        channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[BucketedPresence] User left:', key);
          }
          // Efficiently update state without full rebuild
          const state = channel.presenceState();
          const users: PresenceUser[] = [];
          Object.values(state).forEach((presences: any) => {
            presences.forEach((presence: any) => {
              users.push({
                profile_id: presence.profile_id,
                location: presence.location,
                vibe: presence.vibe,
                last_seen: presence.last_seen || new Date().toISOString(),
                isFriend: friendIds.includes(presence.profile_id)
              });
            });
          });
          setPeople(users);
          setLastHeartbeat(Date.now());
        });

        // Use proper subscribe pattern for reconnect safety
        await channel.subscribe();

        // Skip initial poll if socket provides data via sync event
        // Only poll vibes_now for specific tile area after 2 seconds if no socket data
        const pollTimeout = setTimeout(async () => {
          if (hasSocketData) return; // Skip poll if socket already provided data
          
          try {
            if (process.env.NODE_ENV === 'development') {
              console.log('[BucketedPresence] Socket timeout, fetching from vibes_now table for tile:', h3Index);
            }
            
            // Simplified query to avoid TypeScript deep inference issues
            const recentTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();
            const query = supabase
              .from('vibes_now')
              .select('profile_id, location, vibe, updated_at')
              .not('location', 'is', null)
              .gte('updated_at', recentTime);
            
            const { data: presenceData, error } = await query;

            if (error) {
              console.warn('[BucketedPresence] Error fetching presence data:', error);
              throw error;
            }

            if (presenceData && presenceData.length > 0) {
              if (process.env.NODE_ENV === 'development') {
                console.log('[BucketedPresence] Found real presence data from DB:', presenceData.length, 'users');
              }
              
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
            console.warn('[BucketedPresence] Failed to fetch from vibes_now:', error);
          }

          // Final fallback to empty data (no more automatic mock data)
          console.log('[BucketedPresence] No real presence data found, showing empty state');
          console.log('[BucketedPresence] Tip: Set VITE_USE_MOCK_PRESENCE=true to enable mock data');
          setPeople([]);
          setLastHeartbeat(Date.now());
        }, 2000);

        return () => {
          clearTimeout(pollTimeout);
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.warn('[BucketedPresence] Failed to setup presence system:', error);
        // Fallback to empty data (no automatic mock data)
        console.log('[BucketedPresence] Tip: Set VITE_USE_MOCK_PRESENCE=true to enable mock data');
        setPeople([]);
        setLastHeartbeat(Date.now());
      }
    };
    
    setupPresence();

  }, [lat, lng, friendIds.join(','), showMockData]);

  // Separate useEffect for presence tracking to avoid spam on reconnect
  useEffect(() => {
    if (!lat || !lng || showMockData) return;

    let uid: string | undefined;

    const setupPresenceTracking = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        uid = session?.user.id;
        
        if (!uid) {
          console.warn('[BucketedPresence] No authenticated user for presence tracking');
          return;
        }

        const h3Index = geoToH3(lat, lng, 7);
        const channelName = `presence-${h3Index}`;
        
        // Create channel only once
        if (!channelRef.current) {
          channelRef.current = supabase.channel(channelName);
          await channelRef.current.subscribe();
        }

        // Track presence immediately
        await channelRef.current.track({
          profile_id: uid,
          location: {
            type: 'Point',
            coordinates: [lng, lat] // [longitude, latitude]
          },
          vibe: 'social', // TODO: Get actual user vibe from state
          last_seen: new Date().toISOString()
        }).catch(console.warn);
        
        lastTrackRef.current = Date.now();
      } catch (error) {
        console.warn('[BucketedPresence] Failed to setup presence tracking:', error);
      }
    };

    // Setup initially
    setupPresenceTracking();

    // Set up interval for periodic tracking updates
    const interval = setInterval(async () => {
      const now = Date.now();
      if (now - lastTrackRef.current > 25000 && channelRef.current && uid) {
        try {
          await channelRef.current.track({
            profile_id: uid,
            location: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            vibe: 'social',
            last_seen: new Date().toISOString()
          }).catch(console.warn);
          
          lastTrackRef.current = now;
        } catch (error) {
          console.warn('[BucketedPresence] Failed to update presence:', error);
        }
      }
    }, 25000);

    return () => {
      clearInterval(interval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [lat, lng, showMockData]);

  return { people, lastHeartbeat };
};