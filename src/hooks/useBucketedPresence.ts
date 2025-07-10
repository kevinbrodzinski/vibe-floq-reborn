import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ngeohash from 'ngeohash';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { differenceInMilliseconds } from 'date-fns';
import { useStableMemo } from '@/hooks/useStableMemo';

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
  const OFFLINE_MODE = import.meta.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
  
  // 6.3 - Optimized friend set for O(1) lookups
  const friendsSet = useStableMemo(() => new Set(friendIds || []), [friendIds?.length, friendIds?.join(',')]);
  
  if (OFFLINE_MODE) {
    const people: LivePresence[] = [];
    return { people };
  }

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

  // Query for initial presence data
  const { data: people = [] } = useQuery({
    queryKey: ['presence-nearby', frozenLat, frozenLng],
    queryFn: async () => {
      if (!hasValidCoords) return [];
      
      const { data, error } = await supabase.rpc('presence_nearby', {
        lat: frozenLat!,
        lng: frozenLng!,
        km: 5, // 5km radius
        include_self: false
      });

      if (error) {
        console.error('Error fetching nearby presence:', error);
        return [];
      }

      return (data || []).map((item: any): LivePresence => ({
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
    },
    enabled: hasValidCoords,
    staleTime: 2 * 60 * 1000, // 6.5 - 2 minutes for performance
    refetchOnWindowFocus: false, // 6.5 - Prevent unnecessary refetches
    refetchInterval: 60 * 1000, // Refetch every minute as backup
  });

  // Set up geohash-bucketed realtime subscriptions
  useEffect(() => {
    if (!hasValidCoords) return;

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
          console.log('Presence update:', payload);
          
          // Invalidate and refetch the query to get fresh data
          queryClient.invalidateQueries({ 
            queryKey: ['presence-nearby', frozenLat, frozenLng] 
          });
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Subscribed to presence bucket: ${geohash}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`Error subscribing to presence bucket: ${geohash}`);
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
  }, [hasValidCoords, frozenLat, frozenLng, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  return { people };
};