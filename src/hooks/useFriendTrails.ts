
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
    if (!friendIds?.length) return;

    const channel = supabase
      .channel(`live_positions_trails_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_positions',
          filter: `profile_id=in.(${friendIds.join(',')})`,
        },
        ({ new: row }) => {
          if (!row?.latitude || !row?.longitude) return;

          const arr = buffer.current.get(row.profile_id) ?? [];
          arr.push({ lat: row.latitude, lng: row.longitude, ts: row.last_updated });
          if (arr.length > 5) arr.shift(); // keep 5
          buffer.current.set(row.profile_id, arr);

          force(v => v + 1);               // trigger re-render
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe().catch(console.error);
    };
  }, [friendIds?.join(',')]);

  return buffer.current;
}
