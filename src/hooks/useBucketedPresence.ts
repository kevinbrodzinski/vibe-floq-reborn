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

  // Enhanced query for initial presence data with detailed logging
  const { data: people = [] } = useQuery({
    queryKey: ['presence-nearby', frozenLat, frozenLng],
    queryFn: async () => {
      if (!hasValidCoords) return [];
      
      console.log(`🔍 [PRESENCE_QUERY] Querying nearby people:`, {
        lat: frozenLat, lng: frozenLng,
        radius_km: 5,
        include_self: false,
        mode: env.presenceMode,
        query_location: `${frozenLat}, ${frozenLng}`
      });
      
      const { data, error } = await supabase.rpc('presence_nearby', {
        lat: frozenLat!,
        lng: frozenLng!,
        km: 5, // 5km radius
        include_self: false
      });

      if (error) {
        console.error('❌ [PRESENCE_QUERY] RPC error:', error);
        if (env.debugNetwork) {
          console.error('🔴 Error fetching nearby presence:', error);
        }
        return [];
      }

      console.log(`✅ [PRESENCE_QUERY] Raw RPC response:`, {
        results_count: data?.length || 0,
        raw_data: data?.slice(0, 2),
        all_user_ids: data?.map((p: any) => p.user_id) || []
      });

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

      console.log(`🔄 [PRESENCE_TRANSFORM] Mapped coordinates:`, {
        mapped_count: mappedData.length,
        sample_coords: mappedData.slice(0, 2).map((p, index) => ({ 
          user_id: p.user_id, 
          lat: p.lat, 
          lng: p.lng,
          vibe: p.vibe,
          original_data: data?.[index] || 'missing'
        }))
      });
      
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
          
          // Batch multiple updates using requestAnimationFrame
          let isUpdateScheduled = false;
          if (!isUpdateScheduled) {
            isUpdateScheduled = true;
            requestAnimationFrame(() => {
              queryClient.invalidateQueries({ 
                queryKey: ['presence-nearby', frozenLat, frozenLng] 
              });
              setLastHeartbeat(Date.now());
              isUpdateScheduled = false;
            });
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            if (env.debugPresence) {
              console.log(`✅ Subscribed to presence bucket: ${geohash}`);
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            if (env.debugNetwork) {
              console.warn(`⚠️ WebSocket connection issue for bucket: ${geohash}, status: ${status}`);
            }
            // Track WebSocket errors but don't spam logs
            track('presence_ws_error', { geohash, status });
            
            // Attempt reconnection after delay
            setTimeout(() => {
              if (env.debugNetwork) {
                console.log(`🔄 Attempting to reconnect to bucket: ${geohash}`);
              }
              channel.subscribe();
            }, env.presenceRetryDelay);
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
  
  if (env.presenceMode === 'offline' || env.presenceMode === 'mock') {
    const people: LivePresence[] = [];
    return { people, lastHeartbeat };
  }
  
  // Live mode - actual presence data

  // Live mode returns actual data from the query
  if (env.presenceMode === 'live') {
    // Final debug summary
    useEffect(() => {
      console.log(`📊 [PRESENCE_FINAL] Hook results:`, {
        mode: env.presenceMode,
        people_count: people.length,
        hasValidCoords,
        location: { lat: frozenLat, lng: frozenLng },
        sample_people: people.slice(0, 2)
      });
    }, [people.length, env.presenceMode, hasValidCoords, frozenLat, frozenLng]);
    
    return { people, lastHeartbeat };
  }

  // For all other modes, return empty
  return { people: [], lastHeartbeat };
};