import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TrailPoint { 
  lat: number; 
  lng: number; 
  ts: string; 
}

export function useFriendTrails(friendIds: string[]) {
  const buffer = useRef<Map<string, TrailPoint[]>>(new Map());
  const [, force] = useState(0);           // trigger re-render

  useEffect(() => {
    if (!friendIds.length) return;

    const ch = supabase
      .channel(`vibes_now_trails_${Date.now()}_${Math.random().toString(36)}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vibes_now',
          filter: `id=in.(${friendIds.join(',')})`,
        },
        ({ new: row }) => {
          if (!row.lat || !row.lng) return;
          const arr = buffer.current.get(row.id) ?? [];
          arr.push({ lat: row.lat, lng: row.lng, ts: row.updated_at });
          if (arr.length > 5) arr.shift();
          buffer.current.set(row.id, arr);
          force(v => v + 1);
        },
      )
      .subscribe();

    return () => ch.unsubscribe();
  }, [friendIds.join(',')]);

  return buffer.current; // Map<user_id, TrailPoint[]>
}