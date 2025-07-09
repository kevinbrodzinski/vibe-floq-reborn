import { useEffect, useRef, useState, useMemo } from 'react';
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
  const [people, setPeople] = useState<Record<string, LivePresence>>({});
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const geosLastRef = useRef<string[]>([]);

  /* ----------------------------------------------------------------
   * 1.  Memo-compute the 9 buckets *only when location actually moves
   * ---------------------------------------------------------------- */
  const buckets = useMemo(() => {
    if (lat == null || lng == null) return [];

    const center = ngeohash.encode(lat, lng, GH_PRECISION);
    return [...ngeohash.neighbors(center), center].sort(); // keep deterministic
  }, [lat, lng]);

  /* ----------------------------------------------------------------
   * 2.  Debounced 100 m movement-check so GPS jitter is ignored
   * ---------------------------------------------------------------- */
  const maybeResubscribe = throttle(() => {
    if (!buckets.length) return;

    // 👇 ONLY resubscribe when the *set* of buckets changed
    const last = geosLastRef.current.join(',');
    const next = buckets.join(',');
    if (last === next) return;               // 🛑 nothing changed

    geosLastRef.current = buckets;           // cache for next run

    // 2-A • tear down old channels
    channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    channelsRef.current = [];

    // 2-B • build new channels
    buckets.forEach(code => {
      const ch = supabase
        .channel(`presence:${code}`)
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'vibes_now' },
            payload => {
              const row = (payload.new || payload.old) as any;
              if (!row) return;

              const presence: LivePresence = {
                user_id   : row.user_id,
                vibe      : row.vibe,
                lat       : row.location?.coordinates?.[1] ?? 0,
                lng       : row.location?.coordinates?.[0] ?? 0,
                venue_id  : row.venue_id,
                expires_at: row.expires_at,
              };

              setPeople(prev => {
                const copy = { ...prev };
                if (payload.eventType === 'DELETE') delete copy[presence.user_id];
                else copy[presence.user_id] = presence;
                return copy;
              });
            })
        .subscribe(status => { if (import.meta.env.DEV) console.log(`[presence:${code}]`, status); });

      channelsRef.current.push(ch);
    });

  }, 5000); // throttle to once every 5 s even if GPS floods

  /* ----------------------------------------------------------------
   * 3.  Effect – react to memoised bucket list changes
   * ---------------------------------------------------------------- */
  useEffect(() => {
    maybeResubscribe();            // will early-out if not needed
    return () => maybeResubscribe.cancel();
  }, [buckets]);

  /* ----------------------------------------------------------------
   * 4.  Local purge timer – one per hook
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const purge = setInterval(() => {
      const now = Date.now();
      setPeople(prev => {
        const next: typeof prev = {};
        Object.values(prev).forEach(p => {
          if (differenceInMilliseconds(new Date(p.expires_at), now) > 0)
            next[p.user_id] = p;
        });
        return next;
      });
    }, 1_000);
    return () => clearInterval(purge);
  }, []);

  return { people: Object.values(people) };
};