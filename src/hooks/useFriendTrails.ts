
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { rtChannel } from '@/lib/rtChannel';

export interface TrailPoint {
  lat: number;
  lng: number;
  ts: string;
}

/**
 * Keeps up to the last five GPS fixes per friend (live; in-memory only).
 * @param friendIds – array of `uuid` strings to watch
 * @returns Map<friendId, TrailPoint[]>
 */
export default function useFriendTrails(friendIds: string[]) {
  const buffer = useRef<Map<string, TrailPoint[]>>(new Map());
  // dummy state to force re-renders when buffer mutates
  const [, force] = useState(0);

  useEffect(() => {
    if (!friendIds.length) return;

    const channel = rtChannel(
      supabase,
      `vibes_now_trails_${Date.now()}`
    )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vibes_now',
          filter: `id=in.(${friendIds.join(',')})`,
        },
        ({ new: row }) => {
          if (!row?.lat || !row?.lng) return;

          const arr = buffer.current.get(row.id) ?? [];
          arr.push({ lat: row.lat, lng: row.lng, ts: row.updated_at });
          if (arr.length > 5) arr.shift(); // keep 5
          buffer.current.set(row.id, arr);

          force(v => v + 1);               // trigger re-render
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [friendIds.join(',')]);

  return buffer.current;
}
