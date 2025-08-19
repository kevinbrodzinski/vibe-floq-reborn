import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type RipplesNearRow = {
  ripple_id: string;
  venue_id: string | null;
  includes_friend: boolean;
  both_friends: boolean;
  centroid_lat: number;
  centroid_lng: number;
  distance_m: number;
  expires_at: string;
};

export function useRipplesNear(params: {
  lat: number;
  lng: number;
  radiusM?: number;
  friendsOnly?: boolean;
  recentMinutes?: number;
  onlyCloseFriends?: boolean;
  pollMs?: number;
}) {
  const {
    lat,
    lng,
    radiusM = 1500,
    friendsOnly = false,
    recentMinutes = 15,
    onlyCloseFriends = false,
    pollMs,
  } = params;

  const [data, setData] = useState<RipplesNearRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchOnce() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc('rpc_ripples_near', {
      center_lat: lat,
      center_lng: lng,
      radius_m: radiusM,
      friends_only: friendsOnly,
      recent_minutes: recentMinutes,
      only_close_friends: onlyCloseFriends,
    });
    if (error) setError(error.message);
    setData((data ?? null) as RipplesNearRow[] | null);
    setLoading(false);
  }

  useEffect(() => {
    fetchOnce();
    if (pollMs && pollMs > 0) {
      timer.current = setInterval(fetchOnce, pollMs);
      return () => {
        if (timer.current) clearInterval(timer.current);
      };
    }
    return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, radiusM, friendsOnly, recentMinutes, onlyCloseFriends]);

  return { data, loading, error, refetch: fetchOnce };
}