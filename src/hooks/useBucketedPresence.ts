import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ngeohash from 'ngeohash';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { differenceInMilliseconds } from 'date-fns';

/** how "live" = now-X ms before we purge locally */
const TTL_MS = 90_000;

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
  const [people, setPeople] = useState<Record<string, LivePresence>>({});
  const channelsRef = useRef<RealtimeChannel[]>([]);

  // Subscribe / resubscribe when the user's bucket changes --------------
  useEffect(() => {
    // Guard against missing location (lat/lng undefined on app load)
    if (lat == null || lng == null) return;

    const centerBucket = ngeohash.encode(lat, lng, GH_PRECISION);
    const buckets = [...ngeohash.neighbors(centerBucket), centerBucket]; // 8 neighbours + self

    // Tear down any old channels
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];

    // Helper to merge in / delete presence rows
    const apply = (payload: LivePresence | null, op: 'INSERT' | 'UPDATE' | 'DELETE') =>
      setPeople((prev) => {
        if (!payload) return prev;
        const next = { ...prev };
        if (op === 'DELETE') delete next[payload.user_id];
        else next[payload.user_id] = payload;
        return next;
      });

    // Set up 9 cheap bucketed channels
    buckets.forEach((code) => {
      const chan = supabase
        .channel(`presence:${code}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vibes_now' }, (payload) => {
          try {
            const { eventType, new: newRow, old: oldRow } = payload;
            const row = (newRow || oldRow) as any;
            
            if (!row) return;
            
            const presenceData: LivePresence = {
              user_id: row.user_id,
              vibe: row.vibe,
              lat: row.location ? row.location.coordinates?.[1] || 0 : 0, // PostGIS Point format [lng, lat]
              lng: row.location ? row.location.coordinates?.[0] || 0 : 0,
              venue_id: row.venue_id,
              expires_at: row.expires_at,
            };
            
            apply(presenceData, eventType.toUpperCase() as 'INSERT' | 'UPDATE' | 'DELETE');
          } catch (error) {
            console.error('Failed to parse presence payload:', error, payload);
          }
        })
        .subscribe((status) => console.log(`[presence:${code}] →`, status));

      channelsRef.current.push(chan);
    });

    // local purge timer (runs once per second)
    const purge = setInterval(() => {
      setPeople((prev) => {
        const now = Date.now();
        const next: typeof prev = {};
        Object.values(prev).forEach((p) => {
          if (differenceInMilliseconds(new Date(p.expires_at), now) > 0) next[p.user_id] = p;
        });
        return next;
      });
    }, 1_000);

    return () => {
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
      clearInterval(purge);
    };
  }, [lat, lng]);

  return { people: Object.values(people) };
};