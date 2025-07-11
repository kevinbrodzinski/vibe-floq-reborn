import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ngeohash from 'ngeohash';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { differenceInMilliseconds } from 'date-fns';
import { useStableMemo } from '@/hooks/useStableMemo';
import { getEnvironmentConfig } from '@/lib/environment';
import { track } from '@/lib/analytics';

/** precision-6 buckets → ~1.2 km edge */
const GH_PRECISION = 6;

export interface LivePresence {
  user_id: string;
  vibe: string | null;
  lat: number;
  lng: number;
  venue_id: string | null;
  expires_at: string; // ISO
  isFriend?: boolean; // 6.3 - Add friend detection flag
}

export const useBucketedPresence = (lat?: number, lng?: number, friendIds?: string[]) => {
  const env = useStableMemo(() => getEnvironmentConfig(), []);
  const [lastHeartbeat, setLastHeartbeat] = useState<number>(Date.now());
  const [batteryLevel, setBatteryLevel] = useState<number>(1);
  
  // 6.3 - Optimized friend set for O(1) lookups
  const friendsSet = useStableMemo(() => new Set(friendIds || []), [friendIds?.length, friendIds?.join(',')]);
  
  const queryClient = useQueryClient();
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const geosLastRef = useRef<string[]>([]);
  const lastLatRef = useRef<number>();
  const lastLngRef = useRef<number>();

  // Freeze coordinates once they become valid for stable cache keys
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    lastLatRef.current = lat;
    lastLngRef.current = lng;
  }

  const frozenLat = lastLatRef.current;
  const frozenLng = lastLngRef.current;
  const hasValidCoords = Number.isFinite(frozenLat) && Number.isFinite(frozenLng);

  // Query for initial presence data (live mode only)
  const { data: people = [] } = useQuery({
    queryKey: ['presence-nearby', frozenLat, frozenLng],
    queryFn: async () => {
      if (!hasValidCoords) return [];
      
      if (env.debugPresence) {
        console.log('🔄 Fetching nearby presence data:', { lat: frozenLat, lng: frozenLng });
      }
      
      const { data, error } = await supabase.rpc('presence_nearby', {
        lat: frozenLat!,
        lng: frozenLng!,
        km: 5, // 5km radius
        include_self: false
      });

      if (error) {
        if (env.debugNetwork) {
          console.error('🔴 Error fetching nearby presence:', error);
        }
        return [];
      }

      const mappedData = (data || []).map((item: any): LivePresence => ({
        user_id: item.user_id,
        vibe: item.vibe,
        lat: typeof item.location === 'object' ? 
          parseFloat(item.location.coordinates?.[1]) || 0 : 
          parseFloat(item.lat) || 0,
        lng: typeof item.location === 'object' ? 
          parseFloat(item.location.coordinates?.[0]) || 0 : 
          parseFloat(item.lng) || 0,
        venue_id: item.venue_id,
        expires_at: item.expires_at || new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        isFriend: friendsSet.has(item.user_id) // 6.3 - Mark friends for UI enhancement
      }));
      
      if (env.debugPresence) {
        console.log('✅ Fetched presence data:', { count: mappedData.length, users: mappedData });
      }
      
      // Update heartbeat on successful fetch
      setLastHeartbeat(Date.now());
      
      return mappedData;
    },
    enabled: hasValidCoords && env.presenceMode === 'live',
    staleTime: 2 * 60 * 1000, // 6.5 - 2 minutes for performance
    refetchOnWindowFocus: false, // 6.5 - Prevent unnecessary refetches
    refetchInterval: batteryLevel < 0.2 ? 30 * 1000 : 60 * 1000, // Low-power mode: 30s when battery < 20%
  });

  // Battery API detection for low-power mode
  useEffect(() => {
    const getBattery = async () => {
      try {
        if ('getBattery' in navigator) {
          const battery = await (navigator as any).getBattery();
          if (battery) {
            setBatteryLevel(battery.level);
            
            battery.addEventListener('levelchange', () => {
              setBatteryLevel(battery.level);
            });
          }
        }
      } catch (error) {
        // Battery API not supported, assume full battery
        setBatteryLevel(1);
      }
    };
    
    getBattery();
  }, []);
  
  // Set up geohash-bucketed realtime subscriptions (live mode only)
  useEffect(() => {
    if (!hasValidCoords || !env.enableRealtime || env.presenceMode !== 'live') return;

    // Generate geohashes for current location and surrounding area
    const centerHash = ngeohash.encode(frozenLat!, frozenLng!, GH_PRECISION);
    const neighbors = ngeohash.neighbors(centerHash);
    const allHashes = [centerHash, ...Object.values(neighbors)];

    // Check if we need to update subscriptions
    const hashesChanged = JSON.stringify(allHashes.sort()) !== JSON.stringify(geosLastRef.current.sort());
    if (!hashesChanged) return;

    // Clean up existing channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Create new channels for each geohash bucket
    allHashes.forEach(geohash => {
      const channel = supabase.channel(`presence:${geohash}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'vibes_now',
          filter: `geohash6=eq.${geohash}`
        }, (payload) => {
          if (env.debugPresence) {
            console.log('🔄 Presence update received:', payload);
          }
          
          // Invalidate and refetch the query to get fresh data
          queryClient.invalidateQueries({ 
            queryKey: ['presence-nearby', frozenLat, frozenLng] 
          });
          
          // Update heartbeat on realtime update
          setLastHeartbeat(Date.now());
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            if (env.debugPresence) {
              console.log(`✅ Subscribed to presence bucket: ${geohash}`);
            }
          } else if (status === 'CHANNEL_ERROR') {
            if (env.debugNetwork) {
              console.error(`🔴 Error subscribing to presence bucket: ${geohash}`);
            }
            // Track WebSocket errors
            track('presence_ws_error', { geohash });
          }
        });

      channelsRef.current.push(channel);
    });

    geosLastRef.current = allHashes;

    return () => {
      // Cleanup on unmount or when dependencies change
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [hasValidCoords, frozenLat, frozenLng, queryClient, env.enableRealtime, env.debugPresence, env.debugNetwork, env.presenceMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, []);
  
  if (env.presenceMode === 'mock') {
    const people: LivePresence[] = [];
    return { people, lastHeartbeat };
  }
  
  if (env.presenceMode === 'stub') {
    // Return stub presence data for testing
    const stubPeople: LivePresence[] = lat && lng ? [
      {
        user_id: 'stub-user-1',
        vibe: 'social',
        lat: lat + 0.0005,
        lng: lng - 0.0005,
        venue_id: null,
        expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        isFriend: friendsSet.has('stub-user-1')
      },
      {
        user_id: 'stub-user-2',
        vibe: 'focused',
        lat: lat - 0.0008,
        lng: lng + 0.0003,
        venue_id: null,
        expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        isFriend: friendsSet.has('stub-user-2')
      }
    ] : [];
    
    return { people: stubPeople, lastHeartbeat };
  }

  // Live mode returns actual data from the query
  if (env.presenceMode === 'live') {
    return { people, lastHeartbeat };
  }

  // For all other modes, return empty
  return { people: [], lastHeartbeat };
};