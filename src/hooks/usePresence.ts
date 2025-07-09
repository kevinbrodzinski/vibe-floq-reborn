import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Vibe } from '@/types';

export function usePresence(vibe: Vibe, lat?: number, lng?: number) {
  // refs to keep mutable state outside render cycle
  const intervalId = useRef<NodeJS.Timeout>();
  const inFlight = useRef(false);         // prevents overlap
  const lastPayload = useRef<{ v: Vibe; x: number; y: number }>();

  useEffect(() => {
    if (!lat || !lng) return;                 // wait for a valid fix

    // ① clear any previous timer once, not on every render
    if (intervalId.current) clearInterval(intervalId.current);

    intervalId.current = setInterval(async () => {
      // ② skip if a fetch is still pending
      if (inFlight.current) return;

      // ③ skip if nothing important changed (≤10 m movement)
      const prev = lastPayload.current;
      const moved =
        !prev ||
        vibe !== prev.v ||
        haversineDistance(lat, lng, prev.x, prev.y) > 0.01; // km
      if (!moved) return;

      inFlight.current = true;
      try {
        const { data, error } = await supabase.functions.invoke('upsert-presence', {
          body: {
            vibe,
            lat,
            lng,
            broadcast_radius: 500,
          },
        });

        if (error) throw error;
        
        lastPayload.current = { v: vibe, x: lat, y: lng };
      } catch (err) {
        console.error('presence upsert failed', err);
      } finally {
        inFlight.current = false;
      }
    }, 15_000);                               // one request / 15 s is plenty

    // ④ cleanup
    return () => {
      if (intervalId.current) clearInterval(intervalId.current);
    };
  }, [vibe, lat, lng]);
}

/* small helper so we don't retrigger on GPS jitter */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    0.5 -
    Math.cos(dLat) / 2 +
    (Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      (1 - Math.cos(dLon))) /
      2;
  return R * 2 * Math.asin(Math.sqrt(a));
}
