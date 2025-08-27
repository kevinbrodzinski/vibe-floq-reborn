// src/hooks/useRipplesNear.ts
import { useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

type RipplesRow = {
  ripple_id: string;
  venue_id: string | null;
  includes_friend: boolean;
  both_friends: boolean;
  centroid_lat: number;
  centroid_lng: number;
  distance_m: number;
  expires_at: string;
};

export function useRipplesNear(
  client: SupabaseClient,
  params: {
    lat: number;
    lng: number;
    radiusM?: number;
    friendsOnly?: boolean;
    recentMinutes?: number;
    onlyCloseFriends?: boolean;
    pollMs?: number;
  }
) {
  const {
    lat, lng,
    radiusM = 1500,
    friendsOnly = false,
    recentMinutes = 15,
    onlyCloseFriends = false,
    pollMs
  } = params;

  const [data, setData] = useState<RipplesRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<Error | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchOnce() {
    setLoading(true);
    setErr(null);
    const { data, error } = await client.rpc('rpc_ripples_near', {
      center_lat: lat,
      center_lng: lng,
      radius_m: radiusM,
      friends_only: friendsOnly,
      recent_minutes: recentMinutes,
      only_close_friends: onlyCloseFriends
    });
    if (error) setErr(new Error(error.message));
    setData((data ?? null) as RipplesRow[] | null);
    setLoading(false);
  }

  useEffect(() => {
    fetchOnce();
    if (pollMs && pollMs > 0) {
      timer.current = setInterval(fetchOnce, pollMs);
      return () => { if (timer.current) clearInterval(timer.current); };
    }
    return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, radiusM, friendsOnly, recentMinutes, onlyCloseFriends, client]);

  return { data, loading, error, refetch: fetchOnce };
}