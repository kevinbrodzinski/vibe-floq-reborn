import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ngeohash from 'ngeohash';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { differenceInMilliseconds } from 'date-fns';
import { throttle } from 'lodash-es';

/** precision-6 buckets → ~1.2 km edge */
const GH_PRECISION = 6;

export interface LivePresence {
  user_id: string;
  vibe: string | null;
  lat: number;
  lng: number;
  venue_id: string | null;
  expires_at: string; // ISO
}

export const useBucketedPresence = (lat?: number, lng?: number) => {
  const queryClient = useQueryClient();
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const geosLastRef = useRef<string[]>([]);

  // React Query for fetching initial presence data
  const { data: people = [] } = useQuery({
    queryKey: ['bucketed-presence', lat, lng],
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
    queryFn: async () => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
      
      // Get initial presence data using proximity query
      const { data, error } = await supabase.rpc('presence_nearby', {
        lat: lat!,
        lng: lng!,
        km: 2, // 2km radius for initial fetch
        include_self: false
      });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        user_id: row.user_id,
        vibe: row.vibe,
        lat: row.location?.coordinates?.[1] ?? 0,
        lng: row.location?.coordinates?.[0] ?? 0,
        venue_id: row.venue_id,
        expires_at: row.expires_at,
      })) as LivePresence[];
    },
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // 1 minute
  });

  // Compute buckets when location changes
  const buckets = Number.isFinite(lat) && Number.isFinite(lng) 
    ? [...ngeohash.neighbors(ngeohash.encode(lat!, lng!, GH_PRECISION)), ngeohash.encode(lat!, lng!, GH_PRECISION)].sort()
    : [];

  // Debounced subscription management
  const maybeResubscribe = throttle(() => {
    if (!buckets.length) return;

    const last = geosLastRef.current.join(',');
    const next = buckets.join(',');
    if (last === next) return;

    geosLastRef.current = buckets;

    // Tear down old channels
    channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    channelsRef.current = [];

    // Build new channels for realtime updates
    buckets.forEach(code => {
      const ch = supabase
        .channel(`presence:${code}`)
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'vibes_now' },
            () => {
              // Invalidate query to refetch data
              queryClient.invalidateQueries({ queryKey: ['bucketed-presence', lat, lng] });
            })
        .subscribe();

      channelsRef.current.push(ch);
    });
  }, 5000);

  // React to bucket changes
  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      maybeResubscribe();
    }
    return () => maybeResubscribe.cancel();
  }, [lat, lng]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, []);

  // Filter out expired presence
  const activePeople = people.filter(person => 
    differenceInMilliseconds(new Date(person.expires_at), Date.now()) > 0
  );

  return { people: activePeople };
};