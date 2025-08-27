// src/hooks/useWaveRippleOverview.ts
import { useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

type Overview = {
  waves_total: number;
  waves_with_friends: number;
  ripples_total: number;
  ripples_with_friends: number;
};

export function useWaveRippleOverview(
  client: SupabaseClient,
  params: {
    lat: number;
    lng: number;
    radiusM?: number;
    recentWaveMinutes?: number;
    recentRippleMinutes?: number;
    onlyCloseFriends?: boolean;
    pollMs?: number;
  }
) {
  const {
    lat, lng,
    radiusM = 1500,
    recentWaveMinutes = 3,
    recentRippleMinutes = 15,
    onlyCloseFriends = false,
    pollMs
  } = params;

  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<Error | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchOnce() {
    setLoading(true);
    setErr(null);
    const { data, error } = await client.rpc('rpc_wave_ripple_overview', {
      center_lat: lat,
      center_lng: lng,
      radius_m: radiusM,
      recent_wave_minutes: recentWaveMinutes,
      recent_ripple_minutes: recentRippleMinutes,
      only_close_friends: onlyCloseFriends
    });
    if (error) setErr(new Error(error.message));
    setData((data?.[0] ?? null) as Overview | null);
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
  }, [lat, lng, radiusM, recentWaveMinutes, recentRippleMinutes, onlyCloseFriends, client]);

  return { data, loading, error, refetch: fetchOnce };
}