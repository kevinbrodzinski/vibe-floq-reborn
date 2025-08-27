// src/hooks/useWavesNear.ts
import { useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

type WavesRow = {
  cluster_id: string;
  venue_id: string | null;
  size: number;
  friends_in_cluster: number;
  centroid_lat: number;
  centroid_lng: number;
  distance_m: number;
  last_seen_at: string;
};

export function useWavesNear(
  client: SupabaseClient,
  params: {
    lat: number;
    lng: number;
    radiusM?: number;
    friendsOnly?: boolean;
    minSize?: number;
    recentMinutes?: number;
    onlyCloseFriends?: boolean;
    pollMs?: number; // optional polling
  }
) {
  const {
    lat, lng,
    radiusM = 1500,
    friendsOnly = true,
    minSize = 3,
    recentMinutes = 3,
    onlyCloseFriends = false,
    pollMs
  } = params;

  const [data, setData] = useState<WavesRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<Error | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchOnce() {
    setLoading(true);
    setErr(null);
    const { data, error } = await client.rpc('rpc_waves_near', {
      center_lat: lat,
      center_lng: lng,
      radius_m: radiusM,
      friends_only: friendsOnly,
      min_size: minSize,
      recent_minutes: recentMinutes,
      only_close_friends: onlyCloseFriends
    });
    if (error) setErr(new Error(error.message));
    setData((data ?? null) as WavesRow[] | null);
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
  }, [lat, lng, radiusM, friendsOnly, minSize, recentMinutes, onlyCloseFriends, client]);

  return { data, loading, error, refetch: fetchOnce };
}