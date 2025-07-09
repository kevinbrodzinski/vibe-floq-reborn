import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ngeohash from 'ngeohash';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { differenceInMilliseconds } from 'date-fns';

/** how "live" = now-X ms before we purge locally */
const TTL_MS = 90_000;

/** precision-6 buckets → ~1.2 km edge */
const GH_PRECISION = 6;

/** minimum distance change (meters) to trigger resubscription */
const MIN_DISTANCE_THRESHOLD = 100;

export interface LivePresence {
  user_id: string;
  vibe: string | null;
  lat: number;
  lng: number;
  venue_id: string | null;
  expires_at: string; // ISO
}

// Helper function to calculate distance between two points
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const useBucketedPresence = (lat?: number, lng?: number) => {
  const [people, setPeople] = useState<Record<string, LivePresence>>({});
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const currentBucketsRef = useRef<string[]>([]);

  // Memoize buckets only when location changes significantly
  const buckets = useMemo(() => {
    if (lat == null || lng == null) return [];
    
    // Check if we should update based on distance threshold
    if (lastLocationRef.current) {
      const distance = calculateDistance(
        lastLocationRef.current.lat, 
        lastLocationRef.current.lng, 
        lat, 
        lng
      );
      
      // If distance is less than threshold, return current buckets
      if (distance < MIN_DISTANCE_THRESHOLD) {
        return currentBucketsRef.current;
      }
    }

    // Calculate new buckets
    const centerBucket = ngeohash.encode(lat, lng, GH_PRECISION);
    const newBuckets = [...ngeohash.neighbors(centerBucket), centerBucket];
    
    // Update refs
    lastLocationRef.current = { lat, lng };
    currentBucketsRef.current = newBuckets;
    
    return newBuckets;
  }, [lat, lng]);

  // Helper to merge in / delete presence rows
  const apply = useCallback((payload: LivePresence | null, op: 'INSERT' | 'UPDATE' | 'DELETE') => {
    setPeople((prev) => {
      if (!payload) return prev;
      const next = { ...prev };
      if (op === 'DELETE') delete next[payload.user_id];
      else next[payload.user_id] = payload;
      return next;
    });
  }, []);

  // Subscribe / resubscribe when the user's bucket changes --------------
  useEffect(() => {
    // Guard against missing location or empty buckets
    if (buckets.length === 0) return;

    // Tear down any old channels
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];

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
            if (import.meta.env.DEV) {
              console.error('Failed to parse presence payload:', error, payload);
            }
          }
        })
        .subscribe((status) => {
          if (import.meta.env.DEV) {
            console.log(`[presence:${code}] →`, status);
          }
        });

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
  }, [buckets, apply]);

  return { people: Object.values(people) };
};